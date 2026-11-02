import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getUploadTargetDirs, getPersistentUploadBase, cleanCorruptedZeroByteFiles } from "@/lib/storage";

export interface CleanupResult {
  success: boolean;
  deletedFilesCount: number;
  freedBytes: number;
  freedMB: number;
  scannedFilesCount: number;
  reportsUpdatedCount: number;
  purgedZeroByteFilesCount: number;
  cutoffDate: string;
  errors: string[];
}

export const VIDEO_RETENTION_DAYS = 120; // 4 months (~120 days)
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v", ".3gp", ".avi"]);

export interface CleanupOptions {
  cleanCompletedBookings?: boolean;
  cleanZeroByteFilesOnly?: boolean;
}

/**
 * Automatically cleans up car condition inspection videos older than threshold,
 * completed bookings videos (if requested), and purges empty (0-byte) corrupted files.
 */
export async function cleanupExpiredVideos(
  daysThreshold = VIDEO_RETENTION_DAYS,
  options?: CleanupOptions
): Promise<CleanupResult> {
  const cutoffTime = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoffTime);

  const result: CleanupResult = {
    success: true,
    deletedFilesCount: 0,
    freedBytes: 0,
    freedMB: 0,
    scannedFilesCount: 0,
    reportsUpdatedCount: 0,
    purgedZeroByteFilesCount: 0,
    cutoffDate: cutoffDate.toISOString(),
    errors: [],
  };

  // 0. Always purge all 0-byte corrupted files first
  try {
    const zeroByteRes = cleanCorruptedZeroByteFiles();
    result.purgedZeroByteFilesCount = zeroByteRes.purgedCount;
    result.scannedFilesCount += zeroByteRes.scannedCount;
  } catch (err: any) {
    result.errors.push(`Zero-byte cleanup error: ${err.message}`);
  }

  if (options?.cleanZeroByteFilesOnly) {
    result.freedMB = 0;
    return result;
  }

  // 1. Clean up from database reports
  try {
    // A. Completed bookings videos (if requested to urgently free up disk space)
    if (options?.cleanCompletedBookings) {
      const completedHandover = await prisma.handoverReport.findMany({
        where: {
          carBodyVideoUrl: { not: null },
          booking: { status: "COMPLETED" },
        },
        select: { id: true, carBodyVideoUrl: true },
      });

      for (const report of completedHandover) {
        if (report.carBodyVideoUrl) {
          deletePhysicalVideoFile(report.carBodyVideoUrl, result);
          result.reportsUpdatedCount++;
        }
      }

      const completedReturn = await prisma.returnReport.findMany({
        where: {
          returnVideoUrl: { not: null },
          booking: { status: "COMPLETED" },
        },
        select: { id: true, returnVideoUrl: true },
      });

      for (const report of completedReturn) {
        if (report.returnVideoUrl) {
          deletePhysicalVideoFile(report.returnVideoUrl, result);
          result.reportsUpdatedCount++;
        }
      }
    }

    // B. Find HandoverReports created > daysThreshold ago with carBodyVideoUrl
    const expiredHandoverReports = await prisma.handoverReport.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        carBodyVideoUrl: { not: null },
      },
      select: { id: true, carBodyVideoUrl: true },
    });

    for (const report of expiredHandoverReports) {
      if (report.carBodyVideoUrl) {
        deletePhysicalVideoFile(report.carBodyVideoUrl, result);
        result.reportsUpdatedCount++;
      }
    }

    // C. Find ReturnReports created > daysThreshold ago with returnVideoUrl
    const expiredReturnReports = await prisma.returnReport.findMany({
      where: {
        returnedAt: { lt: cutoffDate },
        returnVideoUrl: { not: null },
      },
      select: { id: true, returnVideoUrl: true },
    });

    for (const report of expiredReturnReports) {
      if (report.returnVideoUrl) {
        deletePhysicalVideoFile(report.returnVideoUrl, result);
        result.reportsUpdatedCount++;
      }
    }
  } catch (err: any) {
    result.errors.push(`Database cleanup error: ${err.message}`);
  }

  // 2. Scan disk storage folders for inspection video files older than cutoffDate
  const candidateBaseDirs = [
    getPersistentUploadBase(),
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "uploads"),
    "/data/uploads",
  ];

  const foldersToScan = ["inspections_video", "inspections", "damages"];

  for (const baseDir of candidateBaseDirs) {
    for (const subFolder of foldersToScan) {
      const targetDir = path.join(/*turbopackIgnore: true*/ baseDir, subFolder);
      if (fs.existsSync(/*turbopackIgnore: true*/ targetDir)) {
        scanAndDeleteExpiredFiles(targetDir, cutoffDate, result);
      }
    }
  }

  result.freedMB = Math.round((result.freedBytes / (1024 * 1024)) * 100) / 100;
  return result;
}

function deletePhysicalVideoFile(urlOrPath: string, result: CleanupResult) {
  try {
    const relativePath = urlOrPath.replace(/^\/?uploads\//, "");
    const candidateBases = [
      getPersistentUploadBase(),
      path.join(process.cwd(), "public", "uploads"),
      path.join(process.cwd(), "uploads"),
      "/data/uploads",
    ];

    for (const base of candidateBases) {
      const fullPath = path.join(/*turbopackIgnore: true*/ base, relativePath);
      if (fs.existsSync(/*turbopackIgnore: true*/ fullPath)) {
        const stat = fs.statSync(/*turbopackIgnore: true*/ fullPath);
        result.freedBytes += stat.size;
        fs.unlinkSync(/*turbopackIgnore: true*/ fullPath);
        result.deletedFilesCount++;
      }
    }
  } catch (err: any) {
    result.errors.push(`File delete error for ${urlOrPath}: ${err.message}`);
  }
}

function scanAndDeleteExpiredFiles(dir: string, cutoffDate: Date, result: CleanupResult) {
  try {
    const files = fs.readdirSync(/*turbopackIgnore: true*/ dir);
    for (const file of files) {
      const fullPath = path.join(/*turbopackIgnore: true*/ dir, file);
      try {
        const stat = fs.statSync(/*turbopackIgnore: true*/ fullPath);
        if (stat.isDirectory()) {
          scanAndDeleteExpiredFiles(fullPath, cutoffDate, result);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (VIDEO_EXTENSIONS.has(ext)) {
            result.scannedFilesCount++;
            if (stat.mtime < cutoffDate) {
              result.freedBytes += stat.size;
              fs.unlinkSync(/*turbopackIgnore: true*/ fullPath);
              result.deletedFilesCount++;
            }
          }
        }
      } catch (err: any) {
        result.errors.push(`File stat error for ${fullPath}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(`Directory scan error for ${dir}: ${err.message}`);
  }
}

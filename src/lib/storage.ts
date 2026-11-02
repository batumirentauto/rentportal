import path from "path";
import fs from "fs";

/**
 * Returns candidate persistent upload directories.
 * Persistent volume mounts take highest priority so files survive redeploys.
 */
export function getPersistentUploadBase(): string {
  const candidateDirs = [
    process.env.RAILWAY_VOLUME_MOUNT_PATH,
    process.env.DATA_DIR,
    process.env.PERSISTENT_STORAGE_DIR,
    "/data",
    "/mnt/data",
  ].filter(Boolean) as string[];

  for (const dir of candidateDirs) {
    try {
      if (fs.existsSync(dir)) {
        const testFile = path.join(dir, ".perm_test_storage");
        try {
          fs.writeFileSync(testFile, "ok");
          fs.unlinkSync(testFile);
          return path.join(dir, "uploads");
        } catch {
          // not writable, continue
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback to local project public/uploads
  return path.join(process.cwd(), "public", "uploads");
}

/**
 * Get all writable directories where uploaded files should be saved.
 */
export function getUploadTargetDirs(folder: string): string[] {
  const targets: string[] = [];

  // 1. Persistent volume if available
  const persistentBase = getPersistentUploadBase();
  const persistentFolder = path.join(/*turbopackIgnore: true*/ persistentBase, folder);
  targets.push(persistentFolder);

  // 2. Also ensure local public/uploads for standard Next static fallback
  const publicFolder = path.join(process.cwd(), "public", "uploads", folder);
  if (!targets.includes(publicFolder)) {
    targets.push(publicFolder);
  }

  return targets;
}

/**
 * Save an uploaded file buffer to all target directories.
 * Ensures data integrity, prevents zero-byte file writes, and cleans up on failure.
 */
export async function saveUploadedFile(
  buffer: Buffer,
  folder: string,
  fileName: string
): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Невозможно сохранить пустой файл (размер 0 байт)");
  }

  const targetDirs = getUploadTargetDirs(folder);
  let savedCount = 0;
  let lastError: Error | null = null;

  for (const dir of targetDirs) {
    let fullPath: string | null = null;
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
      }
      fullPath = path.join(/*turbopackIgnore: true*/ dir, fileName);
      fs.writeFileSync(/*turbopackIgnore: true*/ fullPath, buffer);

      const stat = fs.statSync(/*turbopackIgnore: true*/ fullPath);
      if (stat.size !== buffer.length || stat.size === 0) {
        try { fs.unlinkSync(fullPath); } catch {}
        throw new Error(`Ошибка записи на диск: ожидалось ${buffer.length} байт, записано ${stat.size} байт (возможно, диск переполнен)`);
      }

      savedCount++;
    } catch (e: any) {
      if (fullPath && fs.existsSync(/*turbopackIgnore: true*/ fullPath)) {
        try {
          const stat = fs.statSync(/*turbopackIgnore: true*/ fullPath);
          if (stat.size === 0) {
            fs.unlinkSync(/*turbopackIgnore: true*/ fullPath); // Clean up corrupted 0-byte file immediately!
          }
        } catch {}
      }
      lastError = e;
      console.error(`[Storage] Failed to save file to ${dir}:`, e);
    }
  }

  if (savedCount === 0) {
    const isNoSpace = lastError?.message?.includes("ENOSPC");
    throw new Error(
      isNoSpace
        ? "Недостаточно свободного места на сервере (диск переполнен). Освободите место в разделе Управление -> База данных."
        : `Не удалось сохранить файл на диск: ${lastError?.message || "Неизвестная ошибка записи"}`
    );
  }

  return `/uploads/${folder}/${fileName}`;
}

/**
 * Detect MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".pdf":
      return "application/pdf";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    case ".m4v":
      return "video/x-m4v";
    case ".3gp":
      return "video/3gpp";
    case ".avi":
      return "video/x-msvideo";
    default:
      return "application/octet-stream";
  }
}

/**
 * Safely resolves an uploaded file by path segments across all candidate storage locations.
 * Includes directory traversal protection.
 */
export function resolveUploadedFile(pathSegments: string[]): { filePath: string; mimeType: string; fileSize: number } | null {
  // Sanitize path segments to prevent directory traversal
  const sanitizedSegments = pathSegments.map((s) => s.replace(/[^a-zA-Z0-9._-]/g, "_")).filter((s) => s && s !== ".." && s !== ".");

  if (sanitizedSegments.length === 0) return null;

  const relativePath = path.join(...sanitizedSegments);
  const fileName = sanitizedSegments[sanitizedSegments.length - 1];
  const mimeType = getMimeType(fileName);

  // Candidate base directories to check
  const candidateBases = [
    getPersistentUploadBase(),
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "uploads"),
    "/data/uploads",
  ];

  for (const base of candidateBases) {
    try {
      const candidatePath = path.resolve(/*turbopackIgnore: true*/ base, relativePath);
      const resolvedBase = path.resolve(/*turbopackIgnore: true*/ base);
      // Ensure candidate path is within base
      if (!candidatePath.startsWith(resolvedBase)) continue;

      if (fs.existsSync(/*turbopackIgnore: true*/ candidatePath) && fs.statSync(/*turbopackIgnore: true*/ candidatePath).isFile()) {
        const stat = fs.statSync(/*turbopackIgnore: true*/ candidatePath);
        return { filePath: candidatePath, mimeType, fileSize: stat.size };
      }
    } catch {
      // Continue searching
    }
  }

  return null;
}

/**
 * Scans storage directories and purges empty (0-byte) files.
 */
export function cleanCorruptedZeroByteFiles(): { scannedCount: number; purgedCount: number; purgedFiles: string[] } {
  const candidateBases = [
    getPersistentUploadBase(),
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "uploads"),
    "/data/uploads",
  ];

  let scannedCount = 0;
  let purgedCount = 0;
  const purgedFiles: string[] = [];

  for (const base of candidateBases) {
    if (!fs.existsSync(/*turbopackIgnore: true*/ base)) continue;

    function walkDir(dir: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile()) {
            scannedCount++;
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size === 0) {
                fs.unlinkSync(fullPath);
                purgedCount++;
                purgedFiles.push(entry.name);
              }
            } catch {}
          }
        }
      } catch {}
    }

    walkDir(base);
  }

  return { scannedCount, purgedCount, purgedFiles };
}

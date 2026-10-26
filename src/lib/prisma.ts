import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

export function getDatabasePath(): string {
  // 1. FIRST PRIORITY: Persistent storage locations (Railway Volume, persistent disk mount)
  // When running on Railway with a volume mounted at /data (or custom RAILWAY_VOLUME_MOUNT_PATH),
  // this MUST take absolute priority over any relative file:./dev.db in .env!
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
        // Test write access to ensure the volume is truly mounted and writable
        const testFile = path.join(dir, ".perm_test");
        try {
          fs.writeFileSync(testFile, "ok");
          fs.unlinkSync(testFile);
        } catch (e) {
          console.warn(`[Database] Directory ${dir} exists but is not writable:`, e);
          continue;
        }

        const persistentDbPath = path.join(dir, "rentportal.db");
        // Initialize persistent DB from template on first boot ONLY if it doesn't exist yet!
        if (!fs.existsSync(persistentDbPath)) {
          const templateDb = path.resolve(process.cwd(), "dev.db");
          if (fs.existsSync(templateDb)) {
            fs.copyFileSync(templateDb, persistentDbPath);
            console.log(`[Database] Initialized persistent SQLite at ${persistentDbPath} from template.`);
          }
        } else {
          console.log(`[Database] Using existing persistent SQLite at ${persistentDbPath}.`);
        }

        // Ensure persistent uploads directory
        const dataUploads = path.join(dir, "uploads");
        if (!fs.existsSync(dataUploads)) {
          fs.mkdirSync(dataUploads, { recursive: true });
        }
        const publicUploads = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(publicUploads)) {
          try {
            fs.mkdirSync(path.join(process.cwd(), "public"), { recursive: true });
            fs.symlinkSync(dataUploads, publicUploads);
            console.log(`[Storage] Symlinked ${publicUploads} -> ${dataUploads}`);
          } catch (e) {
            // Ignore if symlink not supported
          }
        }

        return persistentDbPath;
      }
    } catch (err) {
      console.warn(`[Database] Directory ${dir} not accessible:`, err);
    }
  }

  // 2. Explicit absolute DATABASE_URL if configured
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:")) {
    const rawPath = process.env.DATABASE_URL.replace("file:", "");
    if (path.isAbsolute(rawPath)) return rawPath;
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawPath);
  }

  // 3. Fallback to local dev.db
  return path.resolve(process.cwd(), "dev.db");
}

export function isPersistentStorageActive(): { active: boolean; path: string; isVolume: boolean } {
  const currentPath = getDatabasePath();
  const isVolume =
    currentPath.startsWith("/data") ||
    currentPath.startsWith("/mnt/data") ||
    !!process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    !!process.env.DATA_DIR ||
    !!process.env.PERSISTENT_STORAGE_DIR;
  return {
    active: isVolume,
    path: currentPath,
    isVolume,
  };
}

const dbPath = getDatabasePath();
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

export function getDatabasePath(): string {
  // 1. Explicit DATABASE_URL if configured with file:
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:")) {
    const rawPath = process.env.DATABASE_URL.replace("file:", "");
    if (path.isAbsolute(rawPath)) return rawPath;
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawPath);
  }

  // 2. Persistent storage locations (Railway Volume, persistent mount)
  const candidateDirs = [
    process.env.RAILWAY_VOLUME_MOUNT_PATH,
    process.env.DATA_DIR,
    "/data",
  ].filter(Boolean) as string[];

  for (const dir of candidateDirs) {
    try {
      if (fs.existsSync(dir)) {
        const persistentDbPath = path.join(dir, "rentportal.db");
        // Initialize persistent DB from template on first boot if not exists
        if (!fs.existsSync(persistentDbPath)) {
          const templateDb = path.resolve(process.cwd(), "dev.db");
          if (fs.existsSync(templateDb)) {
            fs.copyFileSync(templateDb, persistentDbPath);
            console.log(`[Database] Initialized persistent SQLite at ${persistentDbPath} from template.`);
          }
        }
        return persistentDbPath;
      }
    } catch (err) {
      console.warn(`[Database] Directory ${dir} not accessible:`, err);
    }
  }

  // 3. Fallback to local dev.db
  return path.resolve(process.cwd(), "dev.db");
}

export function isPersistentStorageActive(): { active: boolean; path: string; isVolume: boolean } {
  const currentPath = getDatabasePath();
  const isVolume =
    currentPath.startsWith("/data") ||
    !!process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    !!process.env.DATA_DIR;
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

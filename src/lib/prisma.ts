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

function ensureSchema(dbFilePath: string) {
  try {
    if (!fs.existsSync(dbFilePath)) return;
    const Database = require("better-sqlite3");
    const db = new Database(dbFilePath);

    // 1. Create missing tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS "AdditionalDriver" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "bookingId" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "licenseNumber" TEXT,
        "phone" TEXT,
        "birthDate" TEXT,
        "licensePhotoUrl" TEXT,
        "licenseBackPhotoUrl" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AdditionalDriver_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "BookingRefund" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "bookingId" TEXT NOT NULL,
        "amount" REAL NOT NULL,
        "reason" TEXT NOT NULL,
        "notes" TEXT,
        "method" TEXT NOT NULL DEFAULT 'CASH',
        "accountId" TEXT,
        "managerName" TEXT,
        "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BookingRefund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "BookingRefund_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "BookingExtension" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "bookingId" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'DAYS',
        "extraDays" INTEGER NOT NULL DEFAULT 0,
        "extraHours" INTEGER NOT NULL DEFAULT 0,
        "previousEndDate" DATETIME NOT NULL,
        "newEndDate" DATETIME NOT NULL,
        "dailyRate" REAL,
        "amount" REAL NOT NULL,
        "paymentTiming" TEXT NOT NULL DEFAULT 'ON_RETURN',
        "paymentMethod" TEXT,
        "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "accountId" TEXT,
        "managerName" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BookingExtension_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "BookingExtension_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // 2. Check Car table columns
    try {
      const columns = db.prepare("PRAGMA table_info(Car)").all();
      const colNames = new Set(columns.map((c: any) => c.name));

      if (!colNames.has("isArchived")) {
        db.exec("ALTER TABLE Car ADD COLUMN isArchived INTEGER DEFAULT 0");
      }
      if (!colNames.has("archivedAt")) {
        db.exec("ALTER TABLE Car ADD COLUMN archivedAt TEXT");
      }
      if (!colNames.has("archiveReason")) {
        db.exec("ALTER TABLE Car ADD COLUMN archiveReason TEXT");
      }
      if (!colNames.has("archiveNotes")) {
        db.exec("ALTER TABLE Car ADD COLUMN archiveNotes TEXT");
      }
      if (!colNames.has("techPassportNumber")) {
        db.exec("ALTER TABLE Car ADD COLUMN techPassportNumber TEXT");
      }
      if (!colNames.has("techPassportFrontUrl")) {
        db.exec("ALTER TABLE Car ADD COLUMN techPassportFrontUrl TEXT");
      }
      if (!colNames.has("techPassportBackUrl")) {
        db.exec("ALTER TABLE Car ADD COLUMN techPassportBackUrl TEXT");
      }
      if (!colNames.has("inspectionPhotoUrl")) {
        db.exec("ALTER TABLE Car ADD COLUMN inspectionPhotoUrl TEXT");
      }
      if (!colNames.has("insurancePolicyPhotoUrl")) {
        db.exec("ALTER TABLE Car ADD COLUMN insurancePolicyPhotoUrl TEXT");
      }
    } catch {}

    // 3. Check Booking table columns
    try {
      const bookingColumns = db.prepare("PRAGMA table_info(Booking)").all();
      const bookingColNames = new Set(bookingColumns.map((c: any) => c.name));
      if (!bookingColNames.has("source")) {
        db.exec("ALTER TABLE Booking ADD COLUMN source TEXT DEFAULT 'WHATSAPP'");
      }
      if (!bookingColNames.has("extraHoursCount")) {
        db.exec("ALTER TABLE Booking ADD COLUMN extraHoursCount INTEGER DEFAULT 0");
      }
      if (!bookingColNames.has("extraHoursFee")) {
        db.exec("ALTER TABLE Booking ADD COLUMN extraHoursFee REAL DEFAULT 0");
      }
      if (!bookingColNames.has("isExtraHoursPaid")) {
        db.exec("ALTER TABLE Booking ADD COLUMN isExtraHoursPaid INTEGER DEFAULT 0");
      }
      if (!bookingColNames.has("deliveryAddress")) {
        db.exec("ALTER TABLE Booking ADD COLUMN deliveryAddress TEXT");
      }
      if (!bookingColNames.has("deliveryLocationUrl")) {
        db.exec("ALTER TABLE Booking ADD COLUMN deliveryLocationUrl TEXT");
      }
    } catch {}

    // 4. Check Customer table columns
    try {
      const customerColumns = db.prepare("PRAGMA table_info(Customer)").all();
      const customerColNames = new Set(customerColumns.map((c: any) => c.name));
      if (!customerColNames.has("instagram")) {
        db.exec("ALTER TABLE Customer ADD COLUMN instagram TEXT");
      }
      if (!customerColNames.has("source")) {
        db.exec("ALTER TABLE Customer ADD COLUMN source TEXT DEFAULT 'WHATSAPP'");
      }
    } catch {}

    db.close();
  } catch (e) {
    console.warn("[Database] Schema check/migration notice:", e);
  }
}

const dbPath = getDatabasePath();
ensureSchema(dbPath);
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

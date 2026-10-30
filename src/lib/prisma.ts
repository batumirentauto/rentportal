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

      CREATE TABLE IF NOT EXISTS "BookingCarSwap" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "bookingId" TEXT NOT NULL,
        "newBookingId" TEXT,
        "oldCarId" TEXT NOT NULL,
        "oldCarMileageAtReturn" INTEGER,
        "oldCarFuelLevel" INTEGER,
        "oldCarCleanliness" TEXT DEFAULT 'CLEAN',
        "oldCarCondition" TEXT,
        "oldCarNextStatus" TEXT DEFAULT 'AVAILABLE',
        "daysOnOldCar" INTEGER NOT NULL DEFAULT 1,
        "newCarId" TEXT NOT NULL,
        "newCarMileageAtHandover" INTEGER,
        "newCarFuelLevel" INTEGER,
        "daysOnNewCar" INTEGER NOT NULL DEFAULT 1,
        "swappedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "oldDailyRate" REAL NOT NULL DEFAULT 0,
        "newDailyRate" REAL NOT NULL DEFAULT 0,
        "originalTotalAmount" REAL NOT NULL DEFAULT 0,
        "newTotalAmount" REAL NOT NULL DEFAULT 0,
        "priceDifference" REAL NOT NULL DEFAULT 0,
        "financialAction" TEXT NOT NULL DEFAULT 'NO_CHANGE',
        "differencePaymentMethod" TEXT DEFAULT 'CASH',
        "differencePaymentStatus" TEXT DEFAULT 'PENDING',
        "swapReason" TEXT NOT NULL,
        "reasonDetails" TEXT,
        "managerName" TEXT NOT NULL DEFAULT 'Менеджер смены',
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BookingCarSwap_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "BookingCarSwap_newBookingId_fkey" FOREIGN KEY ("newBookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "BookingCarSwap_oldCarId_fkey" FOREIGN KEY ("oldCarId") REFERENCES "Car" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "BookingCarSwap_newCarId_fkey" FOREIGN KEY ("newCarId") REFERENCES "Car" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "CustomerDebt" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "customerId" TEXT NOT NULL,
        "bookingId" TEXT,
        "carId" TEXT,
        "carPlate" TEXT,
        "amount" REAL NOT NULL,
        "paidAmount" REAL NOT NULL DEFAULT 0,
        "currency" TEXT NOT NULL DEFAULT 'GEL',
        "category" TEXT NOT NULL DEFAULT 'GENERAL',
        "description" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "dueDate" DATETIME,
        "resolvedAt" DATETIME,
        "createdByName" TEXT NOT NULL DEFAULT 'Менеджер смены',
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CustomerDebt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "CustomerDebt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
      if (!colNames.has("tankVolumeLiters")) {
        db.exec("ALTER TABLE Car ADD COLUMN tankVolumeLiters INTEGER DEFAULT 60");
        // Заполняем точные заводские объемы баков для текущего автопарка
        try {
          const cars = db.prepare("SELECT id, model, fuelType FROM Car").all();
          const updateStmt = db.prepare("UPDATE Car SET tankVolumeLiters = ? WHERE id = ?");
          for (const car of cars) {
            let vol = 60;
            const m = (car.model || "").toLowerCase();
            if (car.fuelType === "ELECTRIC" || m.includes("model 3")) vol = 0;
            else if (m.includes("prius")) vol = 45;
            else if (m.includes("accent")) vol = 43;
            else if (m.includes("500")) vol = 35;
            else if (m.includes("renegade")) vol = 48;
            else if (m.includes("compass") || m.includes("patriot") || m.includes("3") || m.includes("jetta") || m.includes("corolla") || m.includes("es 300") || m.includes("trailblazer")) vol = 50;
            else if (m.includes("escape") || m.includes("325d")) vol = 57;
            else if (m.includes("fusion") || m.includes("rav4") || m.includes("venza") || m.includes("tt")) vol = 55;
            else if (m.includes("accord") || m.includes("cx-5")) vol = 56;
            else if (m.includes("tiguan") || m.includes("giulia")) vol = 58;
            else if (m.includes("outlander") || m.includes("avalon")) vol = 60;
            else if (m.includes("crosstrek") || m.includes("forester") || m.includes("outback")) vol = 63;
            else if (m.includes("x3")) vol = 65;
            else if (m.includes("passat") || m.includes("c 350")) vol = 66;
            else if (m.includes("palisade")) vol = 71;
            else if (m.includes("rx 350")) vol = 72;
            else if (m.includes("sienna") || m.includes("touareg") || m.includes("grand caravan")) vol = 76;
            else if (m.includes("ghibli")) vol = 80;
            else if (m.includes("velar")) vol = 82;
            else if (m.includes("x5") || m.includes("q7") || m.includes("range rover")) vol = 86;
            updateStmt.run(vol, car.id);
          }
        } catch {}
      }

      // Land Rover Range Rover (Full size, 3.0 Diesel) update
      try {
        db.prepare(`
          UPDATE Car 
          SET model = 'Range Rover', fuelType = 'DIESEL', engineVolume = '3.0L Diesel', tankVolumeLiters = 86 
          WHERE plateNumber = 'RP-132-RR' OR (brand = 'Land Rover' AND model LIKE '%Sport%')
        `).run();
      } catch {}
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
      if (!bookingColNames.has("swappedFromBookingId")) {
        db.exec("ALTER TABLE Booking ADD COLUMN swappedFromBookingId TEXT");
      }
      if (!bookingColNames.has("swappedToBookingId")) {
        db.exec("ALTER TABLE Booking ADD COLUMN swappedToBookingId TEXT");
      }
      if (!bookingColNames.has("notes")) {
        db.exec("ALTER TABLE Booking ADD COLUMN notes TEXT");
      }
      if (!bookingColNames.has("contractLanguage")) {
        db.exec("ALTER TABLE Booking ADD COLUMN contractLanguage TEXT DEFAULT 'RU'");
      }
    } catch {}

    // 3.1 Check AdditionalDriver table columns
    try {
      const driverColumns = db.prepare("PRAGMA table_info(AdditionalDriver)").all();
      const driverColNames = new Set(driverColumns.map((c: any) => c.name));
      if (!driverColNames.has("licenseExpiryDate")) {
        db.exec("ALTER TABLE AdditionalDriver ADD COLUMN licenseExpiryDate TEXT");
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

    // 5. Check ReturnReport table columns
    try {
      const returnReportCols = db.prepare("PRAGMA table_info(ReturnReport)").all();
      const returnReportColNames = new Set(returnReportCols.map((c: any) => c.name));
      if (!returnReportColNames.has("returnVideoUrl")) {
        db.exec("ALTER TABLE ReturnReport ADD COLUMN returnVideoUrl TEXT");
      }
    } catch {}

    // 6. Clean mock data migration (automatic one-time on persistent storage or boot)
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS "_MigrationFlags" ("id" TEXT PRIMARY KEY, "executedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`);
      const flag = db.prepare(`SELECT id FROM "_MigrationFlags" WHERE id = 'clean_mock_data_v1'`).get();
      if (!flag) {
        console.log("[Database] Running one-time cleanup of mock data...");

        // Delete mock demo expenses
        db.exec(`DELETE FROM Expense;`);

        // Reset account balances to 0 for all company accounts
        db.exec(`UPDATE FinancialAccount SET currentBalance = 0, initialBalance = 0;`);

        // Remove fake manager cash accounts
        db.exec(`
          DELETE FROM FinancialAccount WHERE name LIKE '%Георгий Беридзе%' OR name LIKE '%Зураб Абашидзе%' OR name LIKE '%Николоз Мамулашвили%' OR name LIKE '%Ираклий Чавчавадзе%' OR name LIKE '%Леван Гаприндашвили%';
        `);

        // Delete fake demo users (keeping real users like Руководитель, Евгений, Бачо, and active owners)
        db.exec(`
          DELETE FROM User WHERE fullName IN ('Георгий Беридзе', 'Зураб Абашидзе (Менеджер 2)', 'Николоз Мамулашвили', 'Ираклий Чавчавадзе (Менеджер 2)', 'Леван Гаприндашвили', 'Ираклий Беридзе', 'Ника Кварацхелия', 'Давид Гоциридзе', 'Леван Махарадзе', 'Георгий Церетели', 'Зураб Абашидзе');
        `);

        // Delete fake demo car owners with 0 cars
        db.exec(`
          DELETE FROM CarOwner WHERE fullName IN ('Ираклий Беридзе', 'Ника Кварацхелия', 'Давид Гоциридзе', 'Леван Махарадзе', 'Георгий Церетели', 'Зураб Абашидзе')
          AND id NOT IN (SELECT DISTINCT ownerId FROM Car WHERE ownerId IS NOT NULL);
        `);

        // Delete mock tasks, chats, payouts, payments
        db.exec(`
          DELETE FROM ManagerTask;
          DELETE FROM ChatMessage;
          DELETE FROM OwnerPayout;
          DELETE FROM Payment;
        `);

        db.prepare(`INSERT INTO "_MigrationFlags" (id) VALUES ('clean_mock_data_v1')`).run();
        console.log("[Database] Mock data cleanup successfully executed!");
      }
    } catch (cleanErr) {
      console.warn("[Database] Mock data cleanup notice:", cleanErr);
    }

    // 6.1 Transfer revenue from obsolete Nikoloz mock account to Evgeny and cleanup
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS "_MigrationFlags" ("id" TEXT PRIMARY KEY, "executedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`);
      const nikFlag = db.prepare(`SELECT id FROM "_MigrationFlags" WHERE id = 'transfer_nikoloz_revenue_to_evgeny_v2'`).get();
      if (!nikFlag) {
        console.log("[Database] Checking for obsolete Nikoloz cash account and revenue transfer to Evgeny...");

        // 1. Find Nikoloz account
        const nikolozAcc = db.prepare(`
          SELECT id, name, currentBalance, cityId FROM FinancialAccount 
          WHERE managerResponsible LIKE '%Николоз%' OR name LIKE '%Николоз%' OR id = 'cmvm9rnfs000n987muoi3m70g'
        `).get();

        // 2. Find or create Evgeny user and cash account
        let evgenyUser = db.prepare(`SELECT id, fullName, cityId FROM "User" WHERE fullName LIKE '%Евгений%'`).get();
        let evgenyAcc = db.prepare(`
          SELECT id, name, currentBalance FROM FinancialAccount 
          WHERE managerResponsible LIKE '%Евгений%' OR name LIKE '%Евгений%' OR (userId IS NOT NULL AND userId = ?)
        `).get(evgenyUser ? evgenyUser.id : 'none');

        const batumiCity = db.prepare(`SELECT id FROM City WHERE code = 'BUS' LIMIT 1`).get();
        const cityIdToUse = evgenyUser?.cityId || nikolozAcc?.cityId || batumiCity?.id || null;

        if (!evgenyAcc) {
          const newAccId = "acc_evgeny_" + Date.now();
          db.prepare(`
            INSERT INTO FinancialAccount (id, name, type, bankName, currency, cityId, initialBalance, currentBalance, managerResponsible, userId, isManagerCash, createdAt, updatedAt)
            VALUES (?, 'Касса нал: Евгений (Батуми)', 'CASH', 'NONE', 'GEL', ?, 0, 0, 'Евгений', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(newAccId, cityIdToUse, evgenyUser ? evgenyUser.id : null);
          evgenyAcc = { id: newAccId, name: 'Касса нал: Евгений (Батуми)', currentBalance: 0 };
          console.log("[Database] Created FinancialAccount for Евгений");
        }

        // 3. If Nikoloz account exists, transfer balance and reassign payments
        if (nikolozAcc) {
          const balanceToTransfer = nikolozAcc.currentBalance || 0;
          if (balanceToTransfer > 0) {
            db.prepare(`UPDATE FinancialAccount SET currentBalance = currentBalance + ? WHERE id = ?`).run(balanceToTransfer, evgenyAcc.id);
            console.log(`[Database] Transferred ${balanceToTransfer} GEL from Nikoloz to Evgeny (${evgenyAcc.name})`);
          }

          // Reassign payments from Nikoloz to Evgeny
          db.prepare(`
            UPDATE Payment 
            SET accountId = ?, managerName = 'Евгений' 
            WHERE accountId = ? OR managerName LIKE '%Николоз%' OR managerName = 'Менеджер смены (Грузия)'
          `).run(evgenyAcc.id, nikolozAcc.id);

          // Reassign Handover reports
          db.prepare(`
            UPDATE HandoverReport 
            SET managerName = 'Евгений' 
            WHERE managerName LIKE '%Николоз%' OR managerName = 'Менеджер смены (Грузия)'
          `).run();

          // Reassign Expenses
          db.prepare(`
            UPDATE Expense 
            SET accountId = ?, managerName = 'Евгений' 
            WHERE accountId = ? OR managerName LIKE '%Николоз%'
          `).run(evgenyAcc.id, nikolozAcc.id);

          // DELETE obsolete Nikoloz account so he never appears again!
          db.prepare(`DELETE FROM FinancialAccount WHERE id = ?`).run(nikolozAcc.id);
          console.log("[Database] Deleted obsolete Nikoloz cash account.");
        }

        // 4. Remove any other orphaned seed accounts with fake managers if they have 0 balance and 0 payments
        try {
          db.exec(`
            DELETE FROM FinancialAccount 
            WHERE (managerResponsible IN ('Георгий (Тбилиси)', 'Леван (Кутаиси)') OR name LIKE '%Георгий (Тбилиси)%' OR name LIKE '%Леван (Кутаиси)%')
              AND currentBalance = 0 
              AND id NOT IN (SELECT DISTINCT accountId FROM Payment WHERE accountId IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT accountId FROM Expense WHERE accountId IS NOT NULL);
          `);
        } catch {}

        // 5. Cleanup any accidental 0-balance cash accounts belonging to OWNERs (investors)
        try {
          db.exec(`
            DELETE FROM FinancialAccount 
            WHERE type = 'CASH' 
              AND currentBalance = 0 
              AND userId IN (SELECT id FROM "User" WHERE role = 'OWNER');
          `);
        } catch {}

        db.prepare(`INSERT INTO "_MigrationFlags" (id) VALUES ('transfer_nikoloz_revenue_to_evgeny_v2')`).run();
        console.log("[Database] Migration transfer_nikoloz_revenue_to_evgeny_v2 successfully executed!");
      }
    } catch (migErr) {
      console.warn("[Database] Migration notice:", migErr);
    }

    // 6.2 Cleanup investor / owner cash accounts (German, Maksim Kirichenko, Andrey Kolesnikov)
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS "_MigrationFlags" ("id" TEXT PRIMARY KEY, "executedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`);
      const invCashFlag = db.prepare(`SELECT id FROM "_MigrationFlags" WHERE id = 'cleanup_investors_cash_accounts_v3'`).get();
      if (!invCashFlag) {
        console.log("[Database] Cleaning up cash accounts belonging to investors (German, Maksim, etc)...");

        // 1. Delete 0-balance cash accounts for investors / owners
        db.exec(`
          DELETE FROM FinancialAccount 
          WHERE type = 'CASH' 
            AND currentBalance = 0
            AND (
              managerResponsible IN ('Герман', 'Максим Кириченко', 'Андрей Колесников')
              OR name LIKE '%Герман%'
              OR name LIKE '%Максим Кириченко%'
              OR name LIKE '%Андрей Колесников%'
            )
            AND id NOT IN (SELECT DISTINCT accountId FROM Payment WHERE accountId IS NOT NULL)
            AND id NOT IN (SELECT DISTINCT accountId FROM Expense WHERE accountId IS NOT NULL);
        `);

        // 2. Fix Andrey Kolesnikov role to EXECUTIVE
        try {
          db.prepare(`
            UPDATE "User" SET role = 'EXECUTIVE' WHERE fullName LIKE '%Колесников%' AND role = 'MANAGER';
          `).run();
        } catch {}

        // 3. Remove duplicate MANAGER user for Maksim Kirichenko (he already has OWNER and EXECUTIVE)
        try {
          db.prepare(`
            DELETE FROM "User" WHERE fullName LIKE '%Максим Кириченко%' AND role = 'MANAGER';
          `).run();
        } catch {}

        db.prepare(`INSERT INTO "_MigrationFlags" (id) VALUES ('cleanup_investors_cash_accounts_v3')`).run();
        console.log("[Database] Investor cash accounts cleanup completed successfully!");
      }
    } catch (invErr) {
      console.warn("[Database] Investor cash accounts cleanup notice:", invErr);
    }

    // 7. Auto-sync: Any User with role = 'OWNER' who is missing a CarOwner record
    try {
      const unlinkedOwnerUsers = db.prepare(`
        SELECT id, fullName, phone, email 
        FROM "User" 
        WHERE role = 'OWNER' AND (ownerId IS NULL OR ownerId = '')
      `).all();

      for (const u of unlinkedOwnerUsers) {
        let existingCo = db.prepare(`SELECT id FROM "CarOwner" WHERE fullName = ?`).get(u.fullName);
        let coId = existingCo ? existingCo.id : null;
        if (!coId) {
          const newId = "co_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
          db.prepare(`
            INSERT INTO "CarOwner" (id, fullName, phone, email, whatsapp, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(newId, u.fullName, u.phone || "+995-500-00-00", u.email || null, u.phone || null);
          coId = newId;
          console.log(`[Database] Auto-created CarOwner profile for team member "${u.fullName}"`);
        }
        db.prepare(`UPDATE "User" SET ownerId = ? WHERE id = ?`).run(coId, u.id);
      }
    } catch (autoSyncErr) {
      console.warn("[Database] Owner auto-sync notice:", autoSyncErr);
    }

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

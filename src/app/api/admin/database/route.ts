import { NextResponse } from "next/server";
import { getDatabasePath, isPersistentStorageActive, prisma } from "@/lib/prisma";
import fs from "fs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "1";
    const dbPath = getDatabasePath();

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "Файл базы данных не найден" }, { status: 404 });
    }

    if (isDownload) {
      const fileBuffer = fs.readFileSync(dbPath);
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `rentportal-backup-${dateStr}.db`;

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    }

    const stat = fs.statSync(dbPath);
    const storageInfo = isPersistentStorageActive();

    const [carsCount, bookingsCount, customersCount, expensesCount] = await Promise.all([
      prisma.car.count(),
      prisma.booking.count(),
      prisma.customer.count(),
      prisma.expense.count(),
    ]);

    return NextResponse.json({
      success: true,
      storage: {
        isPersistent: storageInfo.isVolume,
        path: storageInfo.path,
      },
      counts: {
        cars: carsCount,
        bookings: bookingsCount,
        customers: customersCount,
        expenses: expensesCount,
      },
      sizeKb: Math.round(stat.size / 1024),
      lastModified: stat.mtime.toISOString(),
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("Error in database status/download:", error);
    return NextResponse.json({ error: error.message || "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Файл резервной копии не передан" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate SQLite magic header: "SQLite format 3\0"
    const header = buffer.subarray(0, 16).toString("utf-8");
    if (!header.startsWith("SQLite format 3")) {
      return NextResponse.json(
        { error: "Переданный файл не является корректной базой данных SQLite (.db)" },
        { status: 400 }
      );
    }

    const dbPath = getDatabasePath();

    // Create a safety backup of existing DB before restoring
    if (fs.existsSync(dbPath)) {
      const backupPath = `${dbPath}.bak-${Date.now()}`;
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[Database] Created safety backup at ${backupPath}`);
    }

    // Write new database file
    fs.writeFileSync(dbPath, buffer);
    console.log(`[Database] Successfully restored database from upload to ${dbPath}`);

    return NextResponse.json({
      success: true,
      message: "База данных успешно восстановлена из резервной копии!",
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("Error restoring database:", error);
    return NextResponse.json({ error: error.message || "Ошибка восстановления" }, { status: 500 });
  }
}

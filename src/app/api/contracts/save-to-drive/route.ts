import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { getDatabasePath } from "@/lib/prisma";

const GOOGLE_DRIVE_WEBHOOK_URL =
  process.env.GOOGLE_DRIVE_CONTRACTS_WEBHOOK_URL ||
  "https://script.google.com/macros/s/AKfycbyv195kwhbMnEhFqWf04HW0ltKLIYZmaxgD6aooF3z7cY4bdcJdFJR9jOHzHK7m17c/exec";

export async function POST(req: Request) {
  await connection();
  try {
    const body = await req.json();
    const { bookingId, fileName, base64Pdf } = body;

    if (!fileName || !base64Pdf) {
      return NextResponse.json(
        { success: false, error: "Missing fileName or base64Pdf" },
        { status: 400 }
      );
    }

    // 1. Send to Google Apps Script Web App -> Google Drive Folder "Договоры ИИ"
    let driveResult: { success: boolean; fileId?: string; fileUrl?: string; error?: string } = {
      success: false,
    };

    try {
      const gRes = await fetch(GOOGLE_DRIVE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          fileName,
          base64Pdf,
        }),
        redirect: "follow",
      });

      const gData = await gRes.json();
      driveResult = gData;
    } catch (gErr: any) {
      console.error("[GoogleDrive Webhook] Failed to upload contract to Drive:", gErr);
    }

    // 2. Also save locally in persistent /uploads/contracts directory
    let localRelativeUrl: string | null = null;
    try {
      const buffer = Buffer.from(base64Pdf, "base64");
      const safeName = fileName.replace(/[^\wа-яА-ЯёЁა-ჰ.-]/g, "_");

      // Check persistent directory
      const candidateDirs = [
        process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "uploads", "contracts") : null,
        "/data/uploads/contracts",
        path.resolve(process.cwd(), "public", "uploads", "contracts"),
      ].filter(Boolean) as string[];

      for (const dir of candidateDirs) {
        try {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          const filePath = path.join(dir, safeName);
          fs.writeFileSync(filePath, buffer);
          localRelativeUrl = `/uploads/contracts/${safeName}`;
          break;
        } catch {}
      }
    } catch (saveErr) {
      console.warn("[Local Contract Save] Warning:", saveErr);
    }

    // 3. If bookingId is provided, save Google Drive URL into Booking record
    if (bookingId && driveResult.fileUrl) {
      try {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            googleDriveContractUrl: driveResult.fileUrl,
            googleDriveContractId: driveResult.fileId || null,
          },
        });
      } catch (dbErr) {
        console.warn("[DB] Could not update booking with drive URL:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: driveResult.fileUrl
        ? "Договор успешно сохранен в папку «Договоры ИИ» на Google Диске!"
        : "Договор сохранен на сервере",
      fileUrl: driveResult.fileUrl,
      fileId: driveResult.fileId,
      localUrl: localRelativeUrl,
    });
  } catch (error: any) {
    console.error("POST /api/contracts/save-to-drive error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to duplicate contract to Google Drive" },
      { status: 500 }
    );
  }
}

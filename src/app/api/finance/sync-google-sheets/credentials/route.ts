import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getGoogleSheetsCredentials, setCachedGoogleSheetsCredentials } from "@/lib/google-sheets";

export async function GET() {
  try {
    const creds = getGoogleSheetsCredentials();
    return NextResponse.json({
      success: true,
      configured: !!creds,
      clientEmail: creds?.client_email || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let jsonString = (body?.serviceAccountJson || body?.json || "").trim();

    if (!jsonString) {
      return NextResponse.json(
        { success: false, error: "Укажите JSON сервисного аккаунта Google Cloud" },
        { status: 400 }
      );
    }

    // Support base64 encoded
    if (!jsonString.startsWith("{") && jsonString.length > 50) {
      try {
        jsonString = Buffer.from(jsonString, "base64").toString("utf8");
      } catch {}
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return NextResponse.json(
        { success: false, error: "Некорректный формат JSON. Проверьте содержимое файла ключа." },
        { status: 400 }
      );
    }

    if (!parsed.client_email || !parsed.private_key) {
      return NextResponse.json(
        { success: false, error: "Файл ключа должен содержать поля client_email и private_key" },
        { status: 400 }
      );
    }

    // 1. Save in memory cache
    setCachedGoogleSheetsCredentials({
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    });

    // 2. Persist to files where possible
    const savePaths = [
      path.resolve(process.cwd(), "public/uploads/service-account.json"),
      path.resolve(process.cwd(), "service-account.json"),
      "/data/service-account.json",
      "/data/uploads/service-account.json",
    ];

    for (const p of savePaths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(p, JSON.stringify(parsed, null, 2), "utf8");
      } catch {
        // ignore permission issues on non-existent mounts
      }
    }

    return NextResponse.json({
      success: true,
      message: "Ключ сервисного аккаунта Google успешно сохранён и подключен!",
      clientEmail: parsed.client_email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка сохранения ключа" },
      { status: 500 }
    );
  }
}

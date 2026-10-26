import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

const AI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

import { getGeminiApiKey } from "@/lib/gemini-config";

const OCR_PROMPT = `Ты — высокоточный OCR-интеллект и эксперт по проверке и распознаванию документов клиентов сервиса автопроката в Грузии (VSL).
Тебе переданы изображения документов клиента (это может быть Главный разворот паспорта, Лицевая сторона водительского удостоверения и/или Оборотная сторона водительского удостоверения).

Твоя задача — внимательно прочитать текст на документах и извлечь персональные данные клиента для CRM-системы.

Верни СТРОГО один валидный JSON-объект следующей структуры:
{
  "fullName": string | null, // ФИО клиента (предпочтительно на латинице как в загранпаспорте/правах, например "IVAN IVANOV" или "GIORGI BERIDZE")
  "birthDate": string | null, // Дата рождения в формате YYYY-MM-DD (например "1990-05-15")
  "passportNumber": string | null, // Серия и номер паспорта (например "75 1234567" или "A1234567")
  "passportCountry": string | null, // Страна гражданства / выдачи (на русском языке, например "Грузия", "Россия", "Казахстан", "Беларусь", "Турция", "Армения")
  "driverLicenseNumber": string | null, // Номер водительского удостоверения (например "99 12 345678" или "01AA123456")
  "driverLicenseExpiry": string | null, // Срок окончания действия прав в формате YYYY-MM-DD
  "categories": string | null, // Открытые водительские категории (например "B" или "B, C")
  "notes": string | null, // Дополнительные примечания (например, "Стаж с 2015 года", "Выдано МВД")
  "confidence": number // Оценка уверенности распознавания от 0 до 100
}

Если какое-то поле невозможно определить по представленным фото, укажи null. Не придумывай данные! Не используй markdown-разметку, верни чистый JSON.`;

async function loadBase64FromUrl(url: string): Promise<{ mimeType: string; data: string } | null> {
  if (!url) return null;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const arrayBuf = await resp.arrayBuffer();
      const mime = resp.headers.get("content-type") || "image/jpeg";
      return { mimeType: mime, data: Buffer.from(arrayBuf).toString("base64") };
    } else {
      const cleanPath = url.startsWith("/") ? url.slice(1) : url;
      const filePath = path.join(process.cwd(), "public", cleanPath);
      const buffer = await readFile(filePath);
      return { mimeType: "image/jpeg", data: buffer.toString("base64") };
    }
  } catch (err) {
    console.warn("Failed to load image from url:", url, err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY не настроен на сервере" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let passportPhotoUrl: string | null = null;
    let driverLicensePhotoUrl: string | null = null;
    let driverLicenseBackPhotoUrl: string | null = null;

    let customerId: string | null = null;
    let bookingId: string | null = null;
    let autoSave = false;

    // Array of image parts for Gemini
    const imageParts: { mimeType: string; data: string }[] = [];

    const uploadDir = path.join(process.cwd(), "public", "uploads", "customer_docs");
    await mkdir(uploadDir, { recursive: true });

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      customerId = (formData.get("customerId") as string) || null;
      bookingId = (formData.get("bookingId") as string) || null;
      autoSave = formData.get("autoSave") === "true";

      const passportFile = formData.get("passport") as File | null;
      const licenseFrontFile = formData.get("licenseFront") as File | null;
      const licenseBackFile = formData.get("licenseBack") as File | null;

      // Existing URLs passed along
      if (!passportFile && formData.get("passportPhotoUrl")) {
        passportPhotoUrl = formData.get("passportPhotoUrl") as string;
      }
      if (!licenseFrontFile && formData.get("driverLicensePhotoUrl")) {
        driverLicensePhotoUrl = formData.get("driverLicensePhotoUrl") as string;
      }
      if (!licenseBackFile && formData.get("driverLicenseBackPhotoUrl")) {
        driverLicenseBackPhotoUrl = formData.get("driverLicenseBackPhotoUrl") as string;
      }

      if (passportFile && passportFile.size > 0) {
        const bytes = await passportFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `pass-${Date.now()}-${passportFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        passportPhotoUrl = `/uploads/customer_docs/${fileName}`;
        imageParts.push({
          mimeType: passportFile.type || "image/jpeg",
          data: buffer.toString("base64"),
        });
      }

      if (licenseFrontFile && licenseFrontFile.size > 0) {
        const bytes = await licenseFrontFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `dl_front-${Date.now()}-${licenseFrontFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        driverLicensePhotoUrl = `/uploads/customer_docs/${fileName}`;
        imageParts.push({
          mimeType: licenseFrontFile.type || "image/jpeg",
          data: buffer.toString("base64"),
        });
      }

      if (licenseBackFile && licenseBackFile.size > 0) {
        const bytes = await licenseBackFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `dl_back-${Date.now()}-${licenseBackFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        driverLicenseBackPhotoUrl = `/uploads/customer_docs/${fileName}`;
        imageParts.push({
          mimeType: licenseBackFile.type || "image/jpeg",
          data: buffer.toString("base64"),
        });
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      customerId = body.customerId || null;
      bookingId = body.bookingId || null;
      autoSave = Boolean(body.autoSave);

      passportPhotoUrl = body.passportPhotoUrl || null;
      driverLicensePhotoUrl = body.driverLicensePhotoUrl || null;
      driverLicenseBackPhotoUrl = body.driverLicenseBackPhotoUrl || null;

      // Handle base64 if provided
      if (body.passportBase64) {
        const cleanBase64 = body.passportBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `pass-${Date.now()}.jpg`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        passportPhotoUrl = `/uploads/customer_docs/${fileName}`;
        imageParts.push({ mimeType: "image/jpeg", data: cleanBase64 });
      } else if (passportPhotoUrl) {
        const part = await loadBase64FromUrl(passportPhotoUrl);
        if (part) imageParts.push(part);
      }

      if (body.licenseFrontBase64) {
        const cleanBase64 = body.licenseFrontBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `dl_front-${Date.now()}.jpg`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        driverLicensePhotoUrl = `/uploads/customer_docs/${fileName}`;
        imageParts.push({ mimeType: "image/jpeg", data: cleanBase64 });
      } else if (driverLicensePhotoUrl) {
        const part = await loadBase64FromUrl(driverLicensePhotoUrl);
        if (part) imageParts.push(part);
      }

      if (body.licenseBackBase64) {
        const cleanBase64 = body.licenseBackBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `dl_back-${Date.now()}.jpg`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        driverLicenseBackPhotoUrl = `/uploads/customer_docs/${fileName}`;
        imageParts.push({ mimeType: "image/jpeg", data: cleanBase64 });
      } else if (driverLicenseBackPhotoUrl) {
        const part = await loadBase64FromUrl(driverLicenseBackPhotoUrl);
        if (part) imageParts.push(part);
      }
    }

    if (imageParts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Не предоставлено ни одного изображения документов для распознавания",
      }, { status: 400 });
    }

    // Call Gemini with multimodal contents
    const contentsParts: any[] = [{ text: OCR_PROMPT }];
    for (const img of imageParts) {
      contentsParts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }

    let rawResponseText = "";
    let lastError: any = null;

    for (const model of AI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: contentsParts,
            },
          ],
        });

        rawResponseText = response.text || "";
        if (rawResponseText.trim()) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} OCR failed, trying fallback:`, err.message);
      }
    }

    if (!rawResponseText.trim()) {
      return NextResponse.json({
        success: false,
        error: `Не удалось распознать документы: ${lastError?.message || "Пустой ответ модели"}`,
        urls: {
          passportPhotoUrl,
          driverLicensePhotoUrl,
          driverLicenseBackPhotoUrl,
        },
      }, { status: 500 });
    }

    // Parse JSON from response
    let extractedData: any = {};
    try {
      const cleaned = rawResponseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      extractedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn("JSON parse fallback regex matching on:", rawResponseText);
      const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          extractedData = { rawText: rawResponseText };
        }
      }
    }

    // Auto-save to customer if requested and customerId is present
    let updatedCustomer: any = null;
    let targetCustomerId = customerId;

    if (!targetCustomerId && bookingId) {
      const b = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { customerId: true },
      });
      if (b) targetCustomerId = b.customerId;
    }

    if (autoSave && targetCustomerId) {
      const updatePayload: any = {};
      if (extractedData.fullName) updatePayload.fullName = extractedData.fullName;
      if (extractedData.passportNumber) updatePayload.passportNumber = extractedData.passportNumber;
      if (extractedData.passportCountry) updatePayload.passportCountry = extractedData.passportCountry;
      if (extractedData.driverLicenseNumber) updatePayload.driverLicenseNumber = extractedData.driverLicenseNumber;
      if (extractedData.birthDate) updatePayload.birthDate = extractedData.birthDate;
      if (extractedData.driverLicenseExpiry) updatePayload.driverLicenseExpiry = extractedData.driverLicenseExpiry;

      if (passportPhotoUrl) updatePayload.passportPhotoUrl = passportPhotoUrl;
      if (driverLicensePhotoUrl) updatePayload.driverLicensePhotoUrl = driverLicensePhotoUrl;
      if (driverLicenseBackPhotoUrl) updatePayload.driverLicenseBackPhotoUrl = driverLicenseBackPhotoUrl;

      updatedCustomer = await prisma.customer.update({
        where: { id: targetCustomerId },
        data: updatePayload,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Документы успешно распознаны ИИ!",
      urls: {
        passportPhotoUrl,
        driverLicensePhotoUrl,
        driverLicenseBackPhotoUrl,
      },
      extractedData,
      customer: updatedCustomer,
    });
  } catch (error: any) {
    console.error("Error in recognize-documents route:", error);
    return NextResponse.json({
      success: false,
      error: `Внутренняя ошибка сервиса распознавания: ${error.message}`,
    }, { status: 500 });
  }
}

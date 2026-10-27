import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { getGeminiApiKey } from "@/lib/gemini-config";

const AI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

const INSPECTION_OCR_PROMPT = `Ты — экспертный модуль компьютерного зрения и OCR для распознавания диагностических карт и сертификатов периодического государственного технического осмотра автомобилей (PTI / Periodical Technical Inspection / ავტოსატრანსპორტო საშუალების პერიოდული ტექნიკური ინსპექტირება) Грузии и международного образца.

Тебе предоставлено изображение диагностической карты, талона или квитанции техосмотра.

Твоя цель — безошибочно найти и нормализовать ключевые данные:
1. inspectionDate: Дата прохождения техосмотра (в формате YYYY-MM-DD, например "2026-03-15")
2. inspectionExpiryDate: Срок окончания действия техосмотра (в формате YYYY-MM-DD, например "2027-03-15"). Если дата окончания не указана явно, но есть дата прохождения, в Грузии техосмотр действует ровно 1 год (прибавь 1 год).
3. inspectionNumber: Номер диагностической карты / сертификата / отчета (например, "PTI-2026-94812" или числовой номер)
4. plateNumber: Государственный регистрационный номер автомобиля (например, "AA-123-BB", "YY-779-NN")
5. vin: 17-значный VIN-код автомобиля (если указан на бланке)
6. odometerMileage: Пробег автомобиля на момент техосмотра (в км, целое число, если указан)
7. result: "PASS" (годен/пройден) или "FAIL" (не пройден)
8. confidence: Оценка уверенности распознавания от 0 до 100

Формат ответа: СТРОГО один валидный JSON-объект без markdown-блоков:
{
  "inspectionDate": string | null,
  "inspectionExpiryDate": string | null,
  "inspectionNumber": string | null,
  "plateNumber": string | null,
  "vin": string | null,
  "odometerMileage": number | null,
  "result": "PASS" | "FAIL",
  "confidence": number
}

Если поле не видно или не указано, верни null. Не выдумывай данные!`;

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

    let inspectionPhotoUrl: string | null = null;
    let carId: string | null = null;
    let autoSave = true;

    const imageParts: { mimeType: string; data: string }[] = [];

    const uploadDir = path.join(process.cwd(), "public", "uploads", "inspections");
    await mkdir(uploadDir, { recursive: true });

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      carId = (formData.get("carId") as string) || null;
      autoSave = formData.get("autoSave") !== "false";

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `pti-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        inspectionPhotoUrl = `/uploads/inspections/${fileName}`;
        imageParts.push({
          mimeType: file.type || "image/jpeg",
          data: buffer.toString("base64"),
        });
      } else if (formData.get("photoUrl")) {
        inspectionPhotoUrl = formData.get("photoUrl") as string;
        const part = await loadBase64FromUrl(inspectionPhotoUrl);
        if (part) imageParts.push(part);
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      carId = body.carId || null;
      autoSave = body.autoSave !== false;
      inspectionPhotoUrl = body.photoUrl || body.inspectionPhotoUrl || null;

      if (body.base64) {
        const cleanBase64 = body.base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `pti-${Date.now()}.jpg`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        inspectionPhotoUrl = `/uploads/inspections/${fileName}`;
        imageParts.push({ mimeType: "image/jpeg", data: cleanBase64 });
      } else if (inspectionPhotoUrl) {
        const part = await loadBase64FromUrl(inspectionPhotoUrl);
        if (part) imageParts.push(part);
      }
    }

    if (imageParts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Не предоставлен файл или фото диагностической карты техосмотра" },
        { status: 400 }
      );
    }

    // Prepare contents
    const contentsParts: any[] = [{ text: INSPECTION_OCR_PROMPT }];
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
          contents: [{ role: "user", parts: contentsParts }],
        });

        rawResponseText = response.text || "";
        if (rawResponseText.trim()) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} inspection OCR failed, trying fallback:`, err.message);
      }
    }

    if (!rawResponseText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: `Не удалось распознать документ техосмотра: ${lastError?.message || "Пустой ответ модели"}`,
          photoUrl: inspectionPhotoUrl,
        },
        { status: 500 }
      );
    }

    // Parse JSON
    let extractedData: any = {};
    try {
      const cleaned = rawResponseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      extractedData = JSON.parse(cleaned);
    } catch {
      const match = rawResponseText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          extractedData = JSON.parse(match[0]);
        } catch {
          extractedData = {};
        }
      }
    }

    // Normalize dates
    let inspectionDateObj: Date | null = null;
    let inspectionExpiryDateObj: Date | null = null;

    if (extractedData.inspectionDate) {
      const d = new Date(extractedData.inspectionDate);
      if (!isNaN(d.getTime())) inspectionDateObj = d;
    }

    if (extractedData.inspectionExpiryDate) {
      const d = new Date(extractedData.inspectionExpiryDate);
      if (!isNaN(d.getTime())) inspectionExpiryDateObj = d;
    } else if (inspectionDateObj) {
      // Default in Georgia is 1 year
      const d = new Date(inspectionDateObj);
      d.setFullYear(d.getFullYear() + 1);
      inspectionExpiryDateObj = d;
    }

    // Auto-save to Car in database if carId is given
    let updatedCar: any = null;
    if (autoSave && carId) {
      const updateData: any = {};

      if (inspectionPhotoUrl) updateData.inspectionPhotoUrl = inspectionPhotoUrl;
      if (inspectionDateObj) updateData.inspectionDate = inspectionDateObj;
      if (inspectionExpiryDateObj) {
        updateData.inspectionExpiryDate = inspectionExpiryDateObj;
        updateData.inspectionStatus = inspectionExpiryDateObj > new Date() ? "VALID" : "EXPIRED";
      }
      if (extractedData.inspectionNumber) {
        updateData.inspectionNumber = String(extractedData.inspectionNumber).trim();
      }

      updatedCar = await prisma.car.update({
        where: { id: carId },
        data: updateData,
        include: { city: true, owner: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Документ техосмотра успешно распознан и сохранен!",
      photoUrl: inspectionPhotoUrl,
      extractedData: {
        inspectionDate: inspectionDateObj ? inspectionDateObj.toISOString().split("T")[0] : null,
        inspectionExpiryDate: inspectionExpiryDateObj ? inspectionExpiryDateObj.toISOString().split("T")[0] : null,
        inspectionNumber: extractedData.inspectionNumber || null,
        plateNumber: extractedData.plateNumber || null,
        vin: extractedData.vin || null,
        odometerMileage: extractedData.odometerMileage || null,
        confidence: extractedData.confidence || 95,
      },
      car: updatedCar,
    });
  } catch (error: any) {
    console.error("Error in recognize-inspection:", error);
    return NextResponse.json(
      { success: false, error: `Ошибка сервиса считывания техосмотра: ${error.message}` },
      { status: 500 }
    );
  }
}

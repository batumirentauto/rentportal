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

const TECH_PASSPORT_OCR_PROMPT = `Ты — экспертный модуль компьютерного зрения и OCR для распознавания свидетельств о регистрации транспортных средств (техпаспортов автомобилей) Грузии (საქართველო / GEORGIA Vehicle Registration Certificate) и международного образца.
Тебе предоставлены изображения лицевой и/или оборотной стороны техпаспорта автомобиля.

Твоя цель — безошибочно найти, считать и нормализовать 4 ключевых параметра автомобиля:
1. VIN-код (Идентификационный номер ТС / Vehicle Identification Number — графа E в техпаспорте, 17 символов)
2. Год выпуска (Year of manufacture — графа B или 4-значное число года)
3. Государственный регистрационный номер (Госномер машины — графа A, например "YY-779-NN", "AA-123-BB", "GG-881-HH")
4. Номер бланка техпаспорта (Свидетельства о регистрации, обычно серия и 7-8 цифр вверху или внизу бланка, например "BVA2040481" или "AA1234567")

Также, если отчетливо видны:
5. Марка ТС (D.1, Make, например "TOYOTA", "FORD", "MERCEDES-BENZ")
6. Модель ТС (D.2 / D.3, Model, например "CAMRY", "ESCAPE", "PRIUS")
7. Цвет ТС (R, Color)

Формат ответа: СТРОГО один валидный JSON-объект без markdown-блоков:
{
  "vin": string | null, // 17-значный VIN-код заглавными латинскими буквами без пробелов
  "year": number | null, // 4-значный год выпуска, например 2018
  "plateNumber": string | null, // Госномер в стандартном формате Грузии, например "YY-779-NN"
  "techPassportNumber": string | null, // Номер техпаспорта
  "brand": string | null, // Марка авто
  "model": string | null, // Модель авто
  "color": string | null, // Цвет кузова на русском
  "confidence": number // Оценка уверенности распознавания от 0 до 100
}

Если какой-то параметр смазан или не виден, верни null для этого поля. Не придумывай данные!`;

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

    let techPassportFrontUrl: string | null = null;
    let techPassportBackUrl: string | null = null;
    let carId: string | null = null;
    let autoSave = false;

    const imageParts: { mimeType: string; data: string }[] = [];

    const uploadDir = path.join(process.cwd(), "public", "uploads", "tech_passports");
    await mkdir(uploadDir, { recursive: true });

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      carId = (formData.get("carId") as string) || null;
      autoSave = formData.get("autoSave") === "true";

      const frontFile = formData.get("front") as File | null;
      const backFile = formData.get("back") as File | null;

      if (!frontFile && formData.get("frontUrl")) {
        techPassportFrontUrl = formData.get("frontUrl") as string;
      }
      if (!backFile && formData.get("backUrl")) {
        techPassportBackUrl = formData.get("backUrl") as string;
      }

      if (frontFile && frontFile.size > 0) {
        const bytes = await frontFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `tp_front-${Date.now()}-${frontFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        techPassportFrontUrl = `/uploads/tech_passports/${fileName}`;
        imageParts.push({
          mimeType: frontFile.type || "image/jpeg",
          data: buffer.toString("base64"),
        });
      }

      if (backFile && backFile.size > 0) {
        const bytes = await backFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `tp_back-${Date.now()}-${backFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        techPassportBackUrl = `/uploads/tech_passports/${fileName}`;
        imageParts.push({
          mimeType: backFile.type || "image/jpeg",
          data: buffer.toString("base64"),
        });
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      carId = body.carId || null;
      autoSave = Boolean(body.autoSave);

      techPassportFrontUrl = body.frontUrl || body.techPassportFrontUrl || null;
      techPassportBackUrl = body.backUrl || body.techPassportBackUrl || null;

      if (body.frontBase64) {
        const cleanBase64 = body.frontBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `tp_front-${Date.now()}.jpg`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        techPassportFrontUrl = `/uploads/tech_passports/${fileName}`;
        imageParts.push({ mimeType: "image/jpeg", data: cleanBase64 });
      } else if (techPassportFrontUrl) {
        const part = await loadBase64FromUrl(techPassportFrontUrl);
        if (part) imageParts.push(part);
      }

      if (body.backBase64) {
        const cleanBase64 = body.backBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `tp_back-${Date.now()}.jpg`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        techPassportBackUrl = `/uploads/tech_passports/${fileName}`;
        imageParts.push({ mimeType: "image/jpeg", data: cleanBase64 });
      } else if (techPassportBackUrl) {
        const part = await loadBase64FromUrl(techPassportBackUrl);
        if (part) imageParts.push(part);
      }
    }

    if (imageParts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Не предоставлено ни одного изображения техпаспорта для считывания",
        },
        { status: 400 }
      );
    }

    // Call Gemini with multimodal contents
    const contentsParts: any[] = [{ text: TECH_PASSPORT_OCR_PROMPT }];
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
        console.warn(`Model ${model} tech passport OCR failed, trying fallback:`, err.message);
      }
    }

    if (!rawResponseText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: `Не удалось распознать техпаспорт: ${lastError?.message || "Пустой ответ модели"}`,
          urls: {
            techPassportFrontUrl,
            techPassportBackUrl,
          },
        },
        { status: 500 }
      );
    }

    // Parse JSON
    let extractedData: any = {};
    try {
      const cleaned = rawResponseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      extractedData = JSON.parse(cleaned);
    } catch (parseErr) {
      const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          extractedData = { rawText: rawResponseText };
        }
      }
    }

    // Clean extracted values
    if (extractedData.vin) {
      extractedData.vin = String(extractedData.vin).toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").trim();
    }
    if (extractedData.plateNumber) {
      extractedData.plateNumber = String(extractedData.plateNumber).toUpperCase().trim();
    }
    if (extractedData.techPassportNumber) {
      extractedData.techPassportNumber = String(extractedData.techPassportNumber).toUpperCase().trim();
    }
    if (extractedData.year) {
      extractedData.year = Number(extractedData.year);
    }

    // Auto-save to Car in database if carId is given and autoSave is requested
    let updatedCar: any = null;
    if (autoSave && carId) {
      const existingCar = await prisma.car.findUnique({ where: { id: carId } });
      const updateData: any = {};
      if (extractedData.vin) updateData.vin = extractedData.vin;
      if (extractedData.year && !isNaN(extractedData.year)) updateData.year = extractedData.year;
      if (extractedData.plateNumber) updateData.plateNumber = extractedData.plateNumber;
      if (extractedData.techPassportNumber) updateData.techPassportNumber = extractedData.techPassportNumber;

      // Brand: preserve existing car brand name and casing!
      if (extractedData.brand) {
        const rawBrand = String(extractedData.brand).trim();
        if (!existingCar?.brand) {
          let b = rawBrand;
          if (b.length > 3 && b === b.toUpperCase()) {
            b = b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
          }
          updateData.brand = b;
        } else if (existingCar.brand.trim().toLowerCase() !== rawBrand.toLowerCase()) {
          let b = rawBrand;
          if (b.length > 3 && b === b.toUpperCase()) {
            b = b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
          }
          updateData.brand = b;
        }
        // If brand matches existing car case-insensitively, keep existingCar.brand unchanged
      }

      // Model: preserve existing car model name and casing!
      if (extractedData.model) {
        const rawModel = String(extractedData.model).trim();
        if (!existingCar?.model) {
          updateData.model = rawModel;
        } else if (existingCar.model.trim().toLowerCase() !== rawModel.toLowerCase()) {
          updateData.model = rawModel;
        }
      }

      if (extractedData.color && !existingCar?.color) {
        updateData.color = extractedData.color;
      }

      if (techPassportFrontUrl) updateData.techPassportFrontUrl = techPassportFrontUrl;
      if (techPassportBackUrl) updateData.techPassportBackUrl = techPassportBackUrl;

      updatedCar = await prisma.car.update({
        where: { id: carId },
        data: updateData,
        include: { city: true, owner: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Данные техпаспорта успешно распознаны ИИ!",
      urls: {
        techPassportFrontUrl,
        techPassportBackUrl,
      },
      extractedData: {
        vin: extractedData.vin || null,
        year: extractedData.year || null,
        plateNumber: extractedData.plateNumber || null,
        techPassportNumber: extractedData.techPassportNumber || null,
        brand: extractedData.brand || null,
        model: extractedData.model || null,
        color: extractedData.color || null,
        confidence: extractedData.confidence || 95,
      },
      car: updatedCar,
    });
  } catch (error: any) {
    console.error("Error in recognize-tech-passport:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Ошибка сервиса считывания техпаспорта: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

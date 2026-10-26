import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // 1. Multipart Form Data (File input)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const folder = (formData.get("folder") as string) || "inspections";

      if (!file) {
        return NextResponse.json({ success: false, error: "Файл не предоставлен" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const cleanFileName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, "_") : "document.jpg";
      const uniqueFileName = `${folder}-${Date.now()}-${cleanFileName}`;

      const publicUrl = await saveUploadedFile(buffer, folder, uniqueFileName);

      return NextResponse.json({
        success: true,
        url: publicUrl,
        fileName: uniqueFileName,
        message: "Файл успешно загружен!",
      });
    }

    // 2. Base64 JSON payload
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { imageBase64, folder = "inspections", fileName = "scan.jpg" } = body;

      if (!imageBase64) {
        return NextResponse.json({ success: false, error: "imageBase64 не передан" }, { status: 400 });
      }

      // Strip data url prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const uniqueFileName = `${folder}-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      const publicUrl = await saveUploadedFile(buffer, folder, uniqueFileName);

      return NextResponse.json({
        success: true,
        url: publicUrl,
        fileName: uniqueFileName,
        message: "Изображение успешно сохранено!",
      });
    }

    return NextResponse.json({ success: false, error: "Неподдерживаемый тип контента" }, { status: 400 });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки: " + error.message }, { status: 500 });
  }
}

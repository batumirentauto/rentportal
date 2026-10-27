import { NextResponse } from "next/server";
import { cleanupExpiredVideos } from "@/lib/video-retention";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    let days = 120;
    try {
      const body = await request.json();
      if (body.days) days = Number(body.days);
    } catch {
      // no body, use default 120 days
    }

    const result = await cleanupExpiredVideos(days);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Cleanup Videos API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка очистки старых видео: " + error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await cleanupExpiredVideos(120);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Ошибка: " + error.message },
      { status: 500 }
    );
  }
}

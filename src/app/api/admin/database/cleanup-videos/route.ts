import { NextResponse } from "next/server";
import { cleanupExpiredVideos } from "@/lib/video-retention";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    let days = 120;
    let cleanCompletedBookings = false;
    let cleanZeroByteFilesOnly = false;

    try {
      const body = await request.json();
      if (body.days !== undefined) days = Number(body.days);
      if (body.cleanCompletedBookings) cleanCompletedBookings = true;
      if (body.cleanZeroByteFilesOnly) cleanZeroByteFilesOnly = true;
    } catch {
      // no body, use default
    }

    const result = await cleanupExpiredVideos(days, {
      cleanCompletedBookings,
      cleanZeroByteFilesOnly,
    });
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

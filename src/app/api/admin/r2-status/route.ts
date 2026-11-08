import { NextResponse } from "next/server";
import { getR2Config, isR2Configured } from "@/lib/r2-storage";

export async function GET() {
  try {
    const config = getR2Config();
    return NextResponse.json({
      success: true,
      configured: isR2Configured(),
      bucket: config?.bucketName,
      publicUrl: config?.publicUrl,
      hasKeyId: Boolean(config?.accessKeyId),
      hasSecret: Boolean(config?.secretAccessKey),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

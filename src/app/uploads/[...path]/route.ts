import { NextResponse } from "next/server";
import { resolveUploadedFile } from "@/lib/storage";
import fs from "fs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const resolved = resolveUploadedFile(pathSegments);

    if (!resolved || !fs.existsSync(resolved.filePath)) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const stat = fs.statSync(resolved.filePath);
    const fileSize = stat.size;
    const range = request.headers.get("range");

    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "1";
    const rawFileName = pathSegments[pathSegments.length - 1] || "file";
    const displayFileName = rawFileName.replace(/^[a-zA-Z0-9_-]+-\d{10,}-/, "") || rawFileName;

    // Support HTTP Range requests (crucial for iOS Safari / Mobile video playback)
    if (range && !isDownload) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (!isNaN(start) && start < fileSize) {
        const chunkSize = end - start + 1;
        const fileBuffer = Buffer.alloc(chunkSize);
        const fd = fs.openSync(resolved.filePath, "r");
        fs.readSync(fd, fileBuffer, 0, chunkSize, start);
        fs.closeSync(fd);

        return new NextResponse(fileBuffer, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": resolved.mimeType,
          },
        });
      }
    }

    const fileBuffer = fs.readFileSync(resolved.filePath);

    const headers: Record<string, string> = {
      "Content-Type": resolved.mimeType,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": isDownload ? "no-cache" : "public, max-age=31536000, immutable",
    };

    if (isDownload) {
      headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(displayFileName)}"`;
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error serving upload:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

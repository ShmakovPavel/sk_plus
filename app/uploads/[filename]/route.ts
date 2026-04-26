import { access, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";
import { getLegacyPublicUploadsDir, getUploadsDir } from "@/lib/uploadStorage";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

function isSafeFilename(value: string) {
  return /^[A-Za-z0-9._-]+$/.test(value);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!isSafeFilename(filename)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const candidates = [
    join(getUploadsDir(), filename),
    join(getLegacyPublicUploadsDir(), filename),
  ];

  for (const path of candidates) {
    try {
      await access(path);
      const file = await readFile(path);
      const ext = extname(filename).toLowerCase();
      return new NextResponse(file, {
        status: 200,
        headers: {
          "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // Try next candidate.
    }
  }

  return new NextResponse("Not Found", { status: 404 });
}

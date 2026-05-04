import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  deleteMedia,
  listMedia,
  uploadMedia,
} from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listMedia();
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list media.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file was provided." },
        { status: 400 },
      );
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: "Only image and video files are supported." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(
      `[upload] starting: name=${file.name} type=${file.type} size=${(
        buffer.length /
        (1024 * 1024)
      ).toFixed(2)}MB`,
    );
    const item = await uploadMedia(
      buffer,
      file.name,
      isVideo ? "video" : "image",
    );
    console.log(`[upload] success: ${item.publicId}`);

    return NextResponse.json({ item });
  } catch (e) {
    console.error("[upload] failed:", e);
    const message =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { publicId, resourceType } = (await request.json()) as {
      publicId?: string;
      resourceType?: "image" | "video";
    };

    if (!publicId || !resourceType) {
      return NextResponse.json(
        { error: "publicId and resourceType are required." },
        { status: 400 },
      );
    }

    await deleteMedia(publicId, resourceType);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

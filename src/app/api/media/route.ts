import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteMedia, listMedia } from "@/lib/cloudinary";

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

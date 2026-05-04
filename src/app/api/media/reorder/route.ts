import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { reorderMedia, type ReorderEntry } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { order?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const order = body.order;
  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json(
      { error: "`order` must be a non-empty array." },
      { status: 400 },
    );
  }

  const entries: ReorderEntry[] = [];
  for (const item of order) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).publicId !== "string"
    ) {
      return NextResponse.json(
        { error: "Each entry needs publicId and resourceType." },
        { status: 400 },
      );
    }
    const rt = (item as Record<string, unknown>).resourceType;
    if (rt !== "image" && rt !== "video") {
      return NextResponse.json(
        { error: "resourceType must be 'image' or 'video'." },
        { status: 400 },
      );
    }
    entries.push({
      publicId: (item as { publicId: string }).publicId,
      resourceType: rt,
    });
  }

  try {
    await reorderMedia(entries);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reorder] failed:", e);
    const message = e instanceof Error ? e.message : "Reorder failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

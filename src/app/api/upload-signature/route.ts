import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { isAuthenticated } from "@/lib/auth";
import { FOLDER, listMedia } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSITION_STEP = 100;

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { count?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const count = Math.min(Math.max(Math.floor(body.count ?? 1), 1), 100);

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiKey || !apiSecret || !cloudName) {
    return NextResponse.json(
      { error: "Cloudinary credentials are not configured." },
      { status: 500 },
    );
  }

  let basePosition = POSITION_STEP;
  try {
    const items = await listMedia();
    const positioned = items
      .map((i) => i.position)
      .filter((p): p is number => p !== null);
    if (positioned.length > 0) {
      basePosition = Math.min(...positioned) - POSITION_STEP;
    }
  } catch (e) {
    console.warn(
      "[upload-signature] could not compute base position, using default:",
      e,
    );
  }

  const timestamp = Math.round(Date.now() / 1000);

  const signatures = Array.from({ length: count }, (_, i) => {
    const position = basePosition - i * POSITION_STEP;
    const context = `position=${position}`;
    const paramsToSign: Record<string, string> = {
      context,
      folder: FOLDER,
      timestamp: String(timestamp),
    };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      apiSecret,
    );
    return { signature, timestamp, context };
  });

  return NextResponse.json({
    apiKey,
    cloudName,
    folder: FOLDER,
    signatures,
  });
}

import { NextResponse } from "next/server";
import { checkPassword, createSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!password) {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 },
    );
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Server is missing ADMIN_PASSWORD configuration." },
      { status: 500 },
    );
  }

  if (!checkPassword(password)) {
    return NextResponse.json(
      { error: "Incorrect password." },
      { status: 401 },
    );
  }

  await createSession();
  return NextResponse.json({ ok: true });
}

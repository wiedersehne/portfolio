import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "portfolio_admin";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

const getSecret = (): string => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET environment variable must be set to a string of at least 16 characters.",
    );
  }
  return secret;
};

const sign = (value: string): string => {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
};

const buildToken = (expiresAt: number): string => {
  const payload = String(expiresAt);
  const signature = sign(payload);
  return `${payload}.${signature}`;
};

const verifyToken = (token: string | undefined): boolean => {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return false;

  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt)) return false;
  if (Date.now() > expiresAt) return false;

  return true;
};

export const checkPassword = (password: string): boolean => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = Buffer.from(password);
  const target = Buffer.from(expected);
  if (provided.length !== target.length) return false;
  return timingSafeEqual(provided, target);
};

export const createSession = async (): Promise<void> => {
  const expiresAt = Date.now() + SESSION_DURATION * 1000;
  const token = buildToken(expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
};

export const destroySession = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
};

export const isAuthenticated = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyToken(token);
};

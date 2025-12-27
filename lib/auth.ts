import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { COOKIE_NAME } from "./constants";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 hours

type SessionPayload = {
  username: string;
  exp: number;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return secret;
}

function sign(data: string) {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("hex");
}

export function createSession(username: string): string {
  const payload: SessionPayload = { username, exp: Date.now() + SESSION_DURATION_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function validateSession(token?: string | null): SessionPayload | null {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const payload: SessionPayload = JSON.parse(Buffer.from(encoded, "base64url").toString());
  if (Date.now() > payload.exp) return null;

  return payload;
}

export function requireAdmin(req: NextRequest): SessionPayload | null {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  return validateSession(cookie);
}

// ✅ FIXED: cookies() is async now
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return validateSession(token);
}

export function buildSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax" as const,
    maxAge: SESSION_DURATION_MS / 1000,
  };
}

export function logoutResponse() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
  return res;
}

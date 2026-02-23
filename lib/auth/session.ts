import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export type SessionPayload = {
  userId: number;
  username: string;
  rol: "casino" | "admin" | "superadmin";
};

type SignedSession = {
  payload: SessionPayload;
  exp: number;
};

const SESSION_SECRET = process.env.SESSION_SECRET || "";

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = 4 - (padded.length % 4 || 4);
  const base64 = padded + "=".repeat(padLength);
  return Buffer.from(base64, "base64").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

export function createSessionCookie(payload: SessionPayload, ttlSeconds = 60 * 60 * 12) {
  if (!SESSION_SECRET) {
    throw new Error("Missing SESSION_SECRET");
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signedPayload: SignedSession = { payload, exp };
  const encoded = base64UrlEncode(JSON.stringify(signedPayload));
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  try {
    const store = await cookies();
    const raw = store.get("session")?.value;
    if (!raw) return null;
    const [encoded, signature] = raw.split(".");
    if (!encoded || !signature || !SESSION_SECRET) return null;

    const expected = signValue(encoded);
    const sigOk = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!sigOk) return null;

    const parsed = JSON.parse(base64UrlDecode(encoded)) as SignedSession;
    if (!parsed?.payload?.userId || !parsed?.payload?.rol) return null;
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

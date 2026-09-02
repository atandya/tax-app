// Server-only helpers: forward the session cookie to the NestJS backend.
import { cookies } from "next/headers";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export interface Me {
  name: string;
  username: string;
  npwp: string | null;
  role: "wajib_pajak" | "admin";
}

async function cookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function getMe(): Promise<Me | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { cookie: await cookieHeader() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

/** GET a backend endpoint with the session cookie forwarded. */
export async function beGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: { cookie: await cookieHeader() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

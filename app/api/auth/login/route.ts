import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";
import { SERVER_ERROR, fail } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) return fail("Please enter your email and password.");

  try {
    await ensureSchema();
    const rows = await getSql()`select id, password_hash from users where email = ${email}`;
    const user = rows[0];
    const ok = user ? await verifyPassword(password, String(user.password_hash)) : false;
    if (!user || !ok) return fail("Incorrect email or password.", 401);

    await setSessionCookie(Number(user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("login failed", err);
    return fail(SERVER_ERROR, 500);
  }
}

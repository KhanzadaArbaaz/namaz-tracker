import { NextRequest, NextResponse } from "next/server";
import { EMAIL_RE, hashPassword, setSessionCookie } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";
import { SERVER_ERROR, fail } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return fail("Please enter a valid email address.");
  }
  if (password.length < 8 || password.length > 200) {
    return fail("Your password must be at least 8 characters long.");
  }

  try {
    await ensureSchema();
    const hash = await hashPassword(password);
    const rows = await getSql()`
      insert into users (email, password_hash) values (${email}, ${hash})
      on conflict (email) do nothing
      returning id`;
    if (rows.length === 0) {
      return fail("An account with this email already exists. Please log in.", 409);
    }
    await setSessionCookie(Number(rows[0].id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("register failed", err);
    return fail(SERVER_ERROR, 500);
  }
}

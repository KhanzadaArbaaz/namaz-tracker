import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { ensureSchema, getSql, getSummary } from "@/lib/db";
import { SERVER_ERROR, fail } from "@/lib/api";
import { PRAYERS } from "@/lib/prayers";

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// GET /api/logs?month=2026-11  ->  that month's marks + overall counts
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return fail("Please log in.", 401);

  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return fail("Invalid month.");
  const start = `${month}-01`;

  try {
    await ensureSchema();
    const logs = await getSql()`
      select to_char(day, 'YYYY-MM-DD') as day, prayer, status
      from prayer_logs
      where user_id = ${userId}
        and day >= ${start}::date
        and day < (${start}::date + interval '1 month')`;
    const summary = await getSummary(userId);
    return NextResponse.json({ logs, summary });
  } catch (err) {
    console.error("load logs failed", err);
    return fail(SERVER_ERROR, 500);
  }
}

// POST /api/logs  { day: "2026-11-08", prayer: "Fajr", status: "prayed" | "missed" | null }
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return fail("Please log in.", 401);

  const body = await req.json().catch(() => null);
  const day = typeof body?.day === "string" ? body.day : "";
  const prayer = body?.prayer;
  const status = body?.status;

  if (!isRealDate(day)) return fail("Invalid date.");
  if (!PRAYERS.includes(prayer)) return fail("Invalid prayer.");
  if (status !== null && status !== "prayed" && status !== "missed") return fail("Invalid status.");

  // Allow up to one day ahead of UTC so users far east of UTC can mark "today".
  const latest = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (day > latest) return fail("You can't mark prayers for a future day.");

  try {
    await ensureSchema();
    const sql = getSql();
    if (status === null) {
      await sql`delete from prayer_logs where user_id = ${userId} and day = ${day}::date and prayer = ${prayer}`;
    } else {
      await sql`
        insert into prayer_logs (user_id, day, prayer, status)
        values (${userId}, ${day}::date, ${prayer}, ${status})
        on conflict (user_id, day, prayer) do update set status = excluded.status`;
    }
    // If a missed prayer was changed, keep "made up" from ever exceeding "missed".
    await sql`
      update users
      set qaza_made_up = least(
        qaza_made_up,
        (select count(*)::int from prayer_logs where user_id = ${userId} and status = 'missed')
      )
      where id = ${userId}`;
    return NextResponse.json({ summary: await getSummary(userId) });
  } catch (err) {
    console.error("save log failed", err);
    return fail(SERVER_ERROR, 500);
  }
}

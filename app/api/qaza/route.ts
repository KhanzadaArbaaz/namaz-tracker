import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { ensureSchema, getSql, getSummary } from "@/lib/db";
import { SERVER_ERROR, fail } from "@/lib/api";

// POST /api/qaza  -> marks one Qaza prayer as made up (only if one is owed)
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return fail("Please log in.", 401);

  try {
    await ensureSchema();
    const rows = await getSql()`
      update users
      set qaza_made_up = qaza_made_up + 1
      where id = ${userId}
        and qaza_made_up < (
          select count(*)::int from prayer_logs where user_id = ${userId} and status = 'missed'
        )
      returning qaza_made_up`;
    if (rows.length === 0) {
      return fail("You have no Qaza prayers to make up right now.", 409);
    }
    return NextResponse.json({ summary: await getSummary(userId) });
  } catch (err) {
    console.error("make up qaza failed", err);
    return fail(SERVER_ERROR, 500);
  }
}

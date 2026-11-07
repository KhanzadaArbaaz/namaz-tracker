import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { PRAYERS } from "@/lib/prayers";

// Hanafi Asr (later shadow length) is always requested: school=1.
const SCHOOL_HANAFI = 1;

// GET /api/times?date=08-11-2026&lat=24.86&lng=67.01
// GET /api/times?date=08-11-2026&city=Karachi&country=Pakistan
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const date = p.get("date") ?? "";
  if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) return fail("Invalid date.");

  let url: string;
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  const city = (p.get("city") ?? "").trim().slice(0, 100);
  const country = (p.get("country") ?? "").trim().slice(0, 100);

  if (p.get("lat") && p.get("lng") && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    const q = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      school: String(SCHOOL_HANAFI),
    });
    url = `https://api.aladhan.com/v1/timings/${date}?${q}`;
  } else if (city && country) {
    const q = new URLSearchParams({ city, country, school: String(SCHOOL_HANAFI) });
    url = `https://api.aladhan.com/v1/timingsByCity/${date}?${q}`;
  } else {
    return fail("Please share your location or enter a city and country.");
  }

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (res.status === 400 || res.status === 404) {
      return fail("We couldn't find prayer times for that place. Please check the city and country.", 404);
    }
    if (!res.ok) throw new Error(`Aladhan responded with ${res.status}`);

    const json = await res.json();
    const raw = json?.data?.timings;
    if (!raw) throw new Error("Aladhan response had no timings");

    const times: Record<string, string> = {};
    for (const name of PRAYERS) {
      const match = String(raw[name] ?? "").match(/\d{1,2}:\d{2}/);
      if (!match) throw new Error(`Missing time for ${name}`);
      times[name] = match[0];
    }
    return NextResponse.json({ times, school: SCHOOL_HANAFI, schoolName: "Hanafi" });
  } catch (err) {
    console.error("prayer times failed", err);
    return fail("Prayer times are not available right now. Please try again in a few minutes.", 502);
  }
}

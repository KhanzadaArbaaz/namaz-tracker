import { NextResponse } from "next/server";

export const SERVER_ERROR = "Something went wrong on our side. Please try again in a moment.";

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

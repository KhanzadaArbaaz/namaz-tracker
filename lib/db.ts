import { neon } from "@neondatabase/serverless";
import type { Summary } from "./prayers";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

// Creates the tables on first use, so there is no separate migration step.
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        create table if not exists users (
          id serial primary key,
          email text not null unique,
          password_hash text not null,
          qaza_made_up integer not null default 0 check (qaza_made_up >= 0),
          created_at timestamptz not null default now()
        )`;
      await sql`
        create table if not exists prayer_logs (
          user_id integer not null references users(id) on delete cascade,
          day date not null,
          prayer text not null check (prayer in ('Fajr','Dhuhr','Asr','Maghrib','Isha')),
          status text not null check (status in ('prayed','missed')),
          primary key (user_id, day, prayer)
        )`;
    })().catch((err) => {
      schemaReady = null; // try again on the next request
      throw err;
    });
  }
  return schemaReady;
}

export async function getSummary(userId: number): Promise<Summary> {
  const sql = getSql();
  const rows = await sql`
    select
      (select count(*) from prayer_logs where user_id = ${userId} and status = 'prayed')::int as prayed,
      (select count(*) from prayer_logs where user_id = ${userId} and status = 'missed')::int as missed,
      (select qaza_made_up from users where id = ${userId}) as made_up`;
  const row = rows[0];
  const missed = Number(row.missed);
  const madeUp = Number(row.made_up ?? 0);
  return {
    prayed: Number(row.prayed),
    missed,
    madeUp,
    qazaOwed: Math.max(missed - madeUp, 0),
  };
}

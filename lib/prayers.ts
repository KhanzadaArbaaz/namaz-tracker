export const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type Prayer = (typeof PRAYERS)[number];
export type Status = "prayed" | "missed";

// Show the gentle Qaza reminder once this many prayers are waiting to be made up.
export const QAZA_WARNING_THRESHOLD = 5;

export type Summary = {
  prayed: number; // all prayers marked as prayed
  missed: number; // all prayers ever marked as missed
  madeUp: number; // missed prayers that were made up
  qazaOwed: number; // missed - madeUp, never below zero
};

"use client";

import { useCallback, useEffect, useState } from "react";
import { PRAYERS, QAZA_WARNING_THRESHOLD, type Prayer, type Status, type Summary } from "@/lib/prayers";

type LogMap = Record<string, Status>; // key: "2026-11-08|Fajr"

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;

function todayKey() {
  const n = new Date();
  return dayKey(n.getFullYear(), n.getMonth(), n.getDate());
}

async function api(url: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("We couldn't connect. Please check your internet and try again.");
  }
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

export default function Tracker() {
  const today = todayKey();
  const [view, setView] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [logs, setLogs] = useState<LogMap>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const monthKey = `${view.year}-${pad(view.month + 1)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/logs?month=${monthKey}`);
      const map: LogMap = {};
      for (const l of data.logs) map[`${l.day}|${l.prayer}`] = l.status;
      setLogs(map);
      setSummary(data.summary);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  function changeMonth(delta: number) {
    const d = new Date(view.year, view.month + delta, 1);
    const next = { year: d.getFullYear(), month: d.getMonth() };
    setView(next);
    const nextKey = `${next.year}-${pad(next.month + 1)}`;
    setSelected(today.startsWith(nextKey) ? today : dayKey(next.year, next.month, 1));
  }

  async function mark(prayer: Prayer, status: Status) {
    const key = `${selected}|${prayer}`;
    const next = logs[key] === status ? null : status; // tapping again clears it
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: selected, prayer, status: next }),
      });
      setLogs((prev) => {
        const copy = { ...prev };
        if (next) copy[key] = next;
        else delete copy[key];
        return copy;
      });
      setSummary(data.summary);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function makeUpOne() {
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/qaza", { method: "POST" });
      setSummary(data.summary);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const errorBox = error && (
    <div className="notice error" role="alert">
      {error}{" "}
      <button className="link" onClick={load}>
        Try again
      </button>
    </div>
  );

  if (!summary) {
    return (
      <>
        {errorBox}
        {loading && <p className="muted">Loading your tracker…</p>}
      </>
    );
  }

  // Calendar grid
  const leadingBlanks = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const atCurrentMonth = monthKey >= today.slice(0, 7);

  const selectedPrayed = PRAYERS.filter((p) => logs[`${selected}|${p}`] === "prayed").length;
  const selectedMissed = PRAYERS.filter((p) => logs[`${selected}|${p}`] === "missed").length;

  return (
    <>
      {errorBox}

      <section className="stats">
        <div className="stat">
          <strong>{summary.prayed}</strong>
          <span>Prayers completed</span>
        </div>
        <div className="stat">
          <strong>{summary.qazaOwed}</strong>
          <span>Qaza to make up</span>
        </div>
        <div className="stat">
          <strong>{summary.madeUp}</strong>
          <span>Qaza made up</span>
        </div>
      </section>

      <section className="card">
        <h2>Qaza prayers</h2>
        <p className="muted">Qaza means a prayer you missed and make up later.</p>

        {summary.qazaOwed >= QAZA_WARNING_THRESHOLD && (
          <div className="notice gentle">
            You have {summary.qazaOwed} prayers to make up. There is no rush and no pressure. Whenever you are
            able, try to make up one prayer at a time. Every prayer you make up counts.
          </div>
        )}

        <button className="btn primary" onClick={makeUpOne} disabled={busy || summary.qazaOwed === 0}>
          I made up one Qaza prayer
        </button>
        {summary.qazaOwed === 0 && <p className="hint">You have no Qaza to make up right now.</p>}
      </section>

      <section className="card">
        <div className="monthbar">
          <button className="btn ghost small" onClick={() => changeMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <h2>{new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
          <button className="btn ghost small" onClick={() => changeMonth(1)} disabled={atCurrentMonth} aria-label="Next month">
            ›
          </button>
        </div>

        <div className="calendar" aria-busy={loading}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="weekday">
              {d}
            </div>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const key = dayKey(view.year, view.month, d);
            return (
              <button
                key={key}
                className={`day${key === selected ? " selected" : ""}${key === today ? " today" : ""}`}
                disabled={key > today}
                onClick={() => setSelected(key)}
                aria-label={`${d}, ${PRAYERS.filter((p) => logs[`${key}|${p}`] === "prayed").length} prayed`}
              >
                <span>{d}</span>
                <span className="dots">
                  {PRAYERS.map((p) => (
                    <i key={p} className={`dot ${logs[`${key}|${p}`] ?? "none"}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <p className="legend">
          <i className="dot prayed" /> Prayed <i className="dot missed" /> Missed <i className="dot none" /> Not marked
        </p>
      </section>

      <section className="card">
        <h2>
          {new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h2>
        <p className="muted">
          {selectedPrayed} of 5 prayed{selectedMissed > 0 ? `, ${selectedMissed} missed` : ""}. Tap a choice again to clear it.
        </p>

        {PRAYERS.map((prayer) => {
          const current = logs[`${selected}|${prayer}`];
          return (
            <div key={prayer} className="prayer-row">
              <span className="prayer-name">{prayer}</span>
              <div className="choices">
                <button
                  className={`choice${current === "prayed" ? " on-prayed" : ""}`}
                  onClick={() => mark(prayer, "prayed")}
                  disabled={busy}
                  aria-pressed={current === "prayed"}
                >
                  Prayed
                </button>
                <button
                  className={`choice${current === "missed" ? " on-missed" : ""}`}
                  onClick={() => mark(prayer, "missed")}
                  disabled={busy}
                  aria-pressed={current === "missed"}
                >
                  Missed
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

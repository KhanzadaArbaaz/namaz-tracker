"use client";

import { useEffect, useRef, useState } from "react";
import { PRAYERS } from "@/lib/prayers";

type Loc =
  | { kind: "coords"; lat: number; lng: number }
  | { kind: "city"; city: string; country: string };

type Result = { times: Record<string, string>; schoolName: string };

const STORAGE_KEY = "namaz-location";

const pad = (n: number) => String(n).padStart(2, "0");

function todayForApi() {
  const d = new Date();
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function to12Hour(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

export default function PrayerTimes() {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const started = useRef(false);

  async function fetchTimes(l: Loc) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ date: todayForApi() });
    if (l.kind === "coords") {
      params.set("lat", String(l.lat));
      params.set("lng", String(l.lng));
    } else {
      params.set("city", l.city);
      params.set("country", l.country);
    }
    try {
      const res = await fetch(`/api/times?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Prayer times are not available right now.");
        return;
      }
      setResult(data);
    } catch {
      setError("We couldn't connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  function applyLocation(l: Loc) {
    setLoc(l);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(l));
    } catch {
      // Storage may be blocked; the app still works without it.
    }
    fetchTimes(l);
  }

  function detect() {
    if (!("geolocation" in navigator)) {
      setError("Your browser can't share your location. Please enter your city and country below.");
      setShowManual(true);
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        applyLocation({ kind: "coords", lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setLocating(false);
        setShowManual(true);
        setError(
          err.code === 1
            ? "Location is turned off for this site. No problem, just enter your city and country below."
            : "We couldn't find your location. Please enter your city and country below."
        );
      },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }

  useEffect(() => {
    if (started.current) return; // avoid a double run in development
    started.current = true;
    let saved: Loc | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      saved = null;
    }
    if (saved) {
      setLoc(saved);
      fetchTimes(saved);
    } else {
      detect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !country.trim()) {
      setError("Please enter both a city and a country.");
      return;
    }
    applyLocation({ kind: "city", city: city.trim(), country: country.trim() });
  }

  const place =
    loc?.kind === "city" ? `${loc.city}, ${loc.country}` : loc?.kind === "coords" ? "Your current location" : "";

  return (
    <section className="card">
      <h2>Today&apos;s prayer times</h2>
      {place && <p className="muted">{place}</p>}

      <p className="method">
        <span className="badge">On</span> Asr method: {result?.schoolName ?? "Hanafi"} (later Asr time)
      </p>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {(loading || locating) && <p className="muted">{locating ? "Finding your location…" : "Loading prayer times…"}</p>}

      {result && (
        <ul className="times">
          {PRAYERS.map((name) => (
            <li key={name}>
              <span>{name}</span>
              <strong>{to12Hour(result.times[name])}</strong>
            </li>
          ))}
        </ul>
      )}

      <div className="row">
        <button className="btn ghost" onClick={detect} disabled={locating}>
          Use my location
        </button>
        <button className="btn ghost" onClick={() => setShowManual((v) => !v)}>
          {showManual ? "Hide city entry" : "Enter city instead"}
        </button>
      </div>

      {showManual && (
        <form onSubmit={submitManual} className="manual">
          <label className="field">
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Karachi" autoComplete="address-level2" />
          </label>
          <label className="field">
            Country
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pakistan" autoComplete="country-name" />
          </label>
          <button className="btn primary" type="submit" disabled={loading}>
            Show prayer times
          </button>
        </form>
      )}
    </section>
  );
}

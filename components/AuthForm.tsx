"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("We couldn't connect. Please check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <form className="card" onSubmit={submit}>
      <h2>{isLogin ? "Log in" : "Create your account"}</h2>

      <label className="field">
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="field">
        Password
        <input
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={isLogin ? undefined : 8}
          required
        />
        {!isLogin && <span className="hint">Use at least 8 characters.</span>}
      </label>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Please wait…" : isLogin ? "Log in" : "Create account"}
      </button>

      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          setMode(isLogin ? "register" : "login");
          setError("");
        }}
      >
        {isLogin ? "New here? Create an account" : "Already have an account? Log in"}
      </button>
    </form>
  );
}

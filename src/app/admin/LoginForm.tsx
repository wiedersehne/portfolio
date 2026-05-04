"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin/dashboard");
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Incorrect password.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-[11px] uppercase tracking-editorial text-muted"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border bg-transparent px-4 py-3 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground"
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full bg-foreground py-3 text-[11px] uppercase tracking-editorial text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Signing in…" : "Enter"}
      </button>
    </form>
  );
}

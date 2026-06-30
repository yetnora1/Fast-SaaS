"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Carries the HTTP status so callers can distinguish auth failures from transient ones. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new ApiError(json.error ?? `Request failed (${res.status})`, res.status);
  // Unwrap the { ok, data } envelope — return data even when it is null,
  // otherwise a legitimate null payload leaks the whole envelope to callers.
  return (json && typeof json === "object" && "ok" in json ? json.data : json) as T;
}

/** Polling hook — the DB-polling realtime transport for KDS/boards. */
export function usePoll<T>(url: string | null, intervalMs = 4000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Auth/permission failures are permanent for this session — once one happens we
  // stop the interval instead of hammering the server (and the console) forever.
  const stopped = useRef(false);

  const load = useCallback(async () => {
    if (!url) return;
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        stopped.current = true;
        // 401 = no/expired session: bounce to login, which re-mints a fresh token
        // (with the current tenantId). 403 = forbidden: surface the error, don't loop.
        if (e.status === 401 && typeof window !== "undefined") {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    stopped.current = false;

    const schedule = () => {
      clearTimeout(timeoutId);
      if (!mounted || stopped.current || !url || intervalMs <= 0) return;
      // Don't poll a backgrounded tab — every tick is a serverless call + DB hit.
      // We resume (and refresh once) on visibilitychange below.
      if (typeof document !== "undefined" && document.hidden) return;
      timeoutId = setTimeout(tick, intervalMs);
    };

    async function tick() {
      if (!mounted) return;
      await load();
      schedule();
    }

    // Coming back to a foregrounded tab: refresh immediately, then resume polling.
    const onVisible = () => {
      if (intervalMs > 0 && mounted && !stopped.current && !document.hidden) tick();
    };

    tick();
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, url, intervalMs]);

  return { data, error, loading, reload: load };
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Carries the HTTP status so callers can distinguish auth failures from transient ones. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

// Abort requests that hang on a bad connection instead of stalling the UI forever;
// a fast failure lets usePoll back off and retry, and lets the user see stale data.
const REQUEST_TIMEOUT_MS = 15_000;

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const controller = init?.signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller!.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (e) {
    // Status 0 = never reached the server (offline/timeout) — safe to retry.
    if ((e as Error).name === "AbortError") throw new ApiError("Slow connection — request timed out", 0);
    throw new ApiError("Network error — check your connection", 0);
  } finally {
    if (timer) clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new ApiError(json.error ?? `Request failed (${res.status})`, res.status);
  // Unwrap the { ok, data } envelope — return data even when it is null,
  // otherwise a legitimate null payload leaks the whole envelope to callers.
  return (json && typeof json === "object" && "ok" in json ? json.data : json) as T;
}

// Last-good response per URL, module-scoped so it survives client-side navigation.
// usePoll paints this instantly (stale-while-revalidate) and refreshes in the
// background — dashboards feel immediate instead of showing a spinner per tab.
// A full page reload clears it, so it never crosses login sessions.
const swrCache = new Map<string, unknown>();

/** Polling hook — the DB-polling realtime transport for KDS/boards. */
export function usePoll<T>(url: string | null, intervalMs = 4000) {
  const [data, setData] = useState<T | null>(() => (url && swrCache.has(url) ? (swrCache.get(url) as T) : null));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !(url && swrCache.has(url)));
  // Auth/permission failures are permanent for this session — once one happens we
  // stop the interval instead of hammering the server (and the console) forever.
  const stopped = useRef(false);
  // Consecutive transient failures — drives exponential backoff on poor networks.
  const failures = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    try {
      const fresh = await api<T>(url);
      swrCache.set(url, fresh);
      setData(fresh);
      setError(null);
      failures.current = 0;
    } catch (e) {
      setError((e as Error).message);
      failures.current += 1;
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        stopped.current = true;
        // Session is over — drop cached responses so the next login starts clean.
        swrCache.clear();
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
      // Back off while the network is failing (2x per failure, capped at 30s),
      // so a weak connection isn't saturated with doomed requests.
      const delay = Math.min(intervalMs * 2 ** Math.min(failures.current, 4), 30_000);
      timeoutId = setTimeout(tick, delay);
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
    // Connectivity restored: refresh right away instead of waiting out the backoff.
    const onOnline = () => {
      if (mounted && !stopped.current) {
        failures.current = 0;
        tick();
      }
    };

    tick();
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
    if (typeof window !== "undefined") window.addEventListener("online", onOnline);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
      if (typeof window !== "undefined") window.removeEventListener("online", onOnline);
    };
  }, [load, url, intervalMs]);

  return { data, error, loading, reload: load };
}

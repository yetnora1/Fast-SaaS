"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error ?? `Request failed (${res.status})`);
  // Unwrap the { ok, data } envelope — return data even when it is null,
  // otherwise a legitimate null payload leaks the whole envelope to callers.
  return (json && typeof json === "object" && "ok" in json ? json.data : json) as T;
}

/** Polling hook — the DB-polling realtime transport for KDS/boards. */
export function usePoll<T>(url: string | null, intervalMs = 4000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const load = useCallback(async () => {
    if (!url) return;
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
    if (url && intervalMs > 0) {
      timer.current = setInterval(load, intervalMs);
      return () => clearInterval(timer.current);
    }
  }, [load, url, intervalMs]);

  return { data, error, loading, reload: load };
}

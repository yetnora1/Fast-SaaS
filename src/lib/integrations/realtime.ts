/**
 * Realtime / push adapter (MySQL-backed).
 *
 * Live KDS/order boards are driven entirely by MySQL: notifications and order
 * state are persisted to MySQL tables, and the client (KDS/board pages) polls
 * its API every few seconds to pick up changes. A lightweight in-memory event
 * bus lets server code fan out events within a single process. No Firebase.
 */

type Listener = (payload: unknown) => void;
const channels = new Map<string, Set<Listener>>();

export function publish(channel: string, payload: unknown) {
  channels.get(channel)?.forEach((l) => {
    try {
      l(payload);
    } catch {
      /* ignore */
    }
  });
}

export function subscribe(channel: string, listener: Listener): () => void {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel)!.add(listener);
  return () => channels.get(channel)?.delete(listener);
}

/** Clients poll MySQL-backed endpoints; this is the single source of truth. */
export const realtimeMode = "mysql-polling" as const;

/** Recommended client poll interval (ms) for KDS/board pages. */
export const POLL_INTERVAL_MS = 4000;

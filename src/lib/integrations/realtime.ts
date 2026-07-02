/**
 * Realtime strategy (PostgreSQL-backed polling).
 *
 * Live KDS/order boards are driven entirely by PostgreSQL: notifications and
 * order state are persisted, and client pages poll their API every few seconds.
 * There is intentionally NO in-process event bus — on serverless each request
 * may run in a different instance, so in-memory fan-out never reaches anyone.
 * If sub-second push is ever needed, add SSE or a hosted pub/sub (Pusher, etc).
 */

/** Clients poll PostgreSQL-backed endpoints; this is the single source of truth. */
export const realtimeMode = "postgres-polling" as const;

/** Recommended client poll interval (ms) for KDS/board pages. */
export const POLL_INTERVAL_MS = 4000;

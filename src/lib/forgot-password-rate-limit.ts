import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 8;

/** Returns true if the request is allowed; increments usage when allowed. */
export function allowForgotPasswordRequest(ipKey: string): boolean {
  const now = Date.now();
  let b = buckets.get(ipKey);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ipKey, b);
  }
  if (b.count >= MAX_REQUESTS) return false;
  b.count += 1;
  return true;
}

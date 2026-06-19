// napps/live-chat/src/lib/time.ts
// Relative "time-ago" formatting for chat timestamps (req 12).

/** Compact relative timestamp: "now", "12s", "5m", "3h", "2d", else a short date. */
export function timeAgo(unixSeconds: number, nowMs: number = Date.now()): string {
  const diffSec = Math.floor(nowMs / 1000) - unixSeconds;
  if (diffSec < 5) return 'now';
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(unixSeconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Full date+time string for the title/hover tooltip. */
export function fullTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}

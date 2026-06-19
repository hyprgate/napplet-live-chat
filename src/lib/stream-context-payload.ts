export interface StreamContextPayload {
  streamAddr: string;
  title: string;
  chatRelays: string[];
}

function coerceRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function parseStreamCurrentContextPayload(payload: unknown): StreamContextPayload | null {
  const record = coerceRecord(payload);
  if (!record || typeof record.streamAddr !== 'string' || !record.streamAddr) return null;

  const title = typeof record.title === 'string' && record.title ? record.title : 'Live chat';
  const chatRelays = Array.isArray(record.chatRelays)
    ? record.chatRelays.filter((url): url is string => typeof url === 'string')
    : [];

  return {
    streamAddr: record.streamAddr,
    title,
    chatRelays,
  };
}

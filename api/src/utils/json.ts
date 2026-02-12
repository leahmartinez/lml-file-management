/**
 * JSON parsing helpers
 */

export function safeParseJsonArray<T = unknown>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

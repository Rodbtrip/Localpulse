// Strict parsing/validation for manually-typed "YYYY-MM-DDTHH:MM" values.
// Returns a Date parsed as LOCAL time, or null if the input is invalid.
const FORMAT = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/;

export function parseLocalDateTime(input: string): Date | null {
  const m = FORMAT.exec(input.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const date = new Date(y, mo - 1, d, h, mi);
  // Reject impossible dates like 2026-02-31 (JS would silently roll over).
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d ||
    date.getHours() !== h ||
    date.getMinutes() !== mi
  ) {
    return null;
  }
  return date;
}

export const DATE_HINT = 'Use the format YYYY-MM-DDTHH:MM, for example 2026-07-11T18:00.';

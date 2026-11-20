const KE_MOBILE = /^(?:\+?254|0)?([71]\d{8})$/;

/** Mirrors backend/api/phone.py: '0712 345 678' → '254712345678', or null if invalid. */
export function normalizeKePhone(raw: string): string | null {
  const match = KE_MOBILE.exec(raw.replace(/[\s\-().]/g, ""));
  return match ? `254${match[1]}` : null;
}

/** '254712345678' → '0712 345 678' for display. */
export function formatKePhone(stored: string | null | undefined): string {
  if (!stored) return "";
  const match = /^254(\d{3})(\d{3})(\d{3})$/.exec(stored);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : stored;
}

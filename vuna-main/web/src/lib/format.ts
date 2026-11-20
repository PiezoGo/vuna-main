const TIME_ZONE = "Africa/Nairobi";
const LOCALE = "en-KE";

const kesFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "KES",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kesWholeFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "KES",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
});

/**
 * Format a money value from the API (DRF sends decimals as strings) as KES.
 * Display only: never use the result for calculations.
 */
export function formatKES(
  value: string | number | null | undefined,
  opts?: { whole?: boolean },
): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : (value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = (opts?.whole ? kesWholeFormatter : kesFormatter).format(safe);
  // Intl renders "KES 1,200.00"; Kenyans write "KSh 1,200.00".
  return formatted.replace("KES", "KSh").replace(/ /g, " ");
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = value ? toDate(value) : null;
  return date ? dateFormatter.format(date) : "";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = value ? toDate(value) : null;
  return date ? dateTimeFormatter.format(date) : "";
}

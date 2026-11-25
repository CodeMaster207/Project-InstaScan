export type Period = "today" | "month" | "year" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
}

/** Heading for a period, such as "Today (27th September 2026)". */
export function periodLabel(period: Period, now: Date = new Date()): string {
  const month = MONTH_NAMES[now.getMonth()];
  switch (period) {
    case "today":
      return `Today (${ordinal(now.getDate())} ${month} ${now.getFullYear()})`;
    case "month":
      return `${month} ${now.getFullYear()}`;
    case "year":
      return `${now.getFullYear()}`;
    case "all":
      return "All time";
  }
}

/** True when an ISO date (YYYY-MM-DD) falls inside the period. Undated items only match "all". */
export function inPeriod(iso: string, period: Period, now: Date = new Date()): boolean {
  if (period === "all") return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (period === "year") return y === now.getFullYear();
  if (period === "month") return y === now.getFullYear() && m === now.getMonth() + 1;
  return y === now.getFullYear() && m === now.getMonth() + 1 && d === now.getDate();
}

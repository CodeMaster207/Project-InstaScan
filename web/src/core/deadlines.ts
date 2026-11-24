import type { WarrantyItem, WarrantyStatus } from "./types";

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Strict YYYY-MM-DD parse into a local-time date, or null. */
export function parseISODate(value: string): Date | null {
  const m = ISO.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  const valid = date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
  return valid ? date : null;
}

export function toISODate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Adds calendar months, clamping to the last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const start = parseISODate(iso);
  if (!start) return "";
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), lastDay));
  return toISODate(target);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole days from today to the end date (negative once expired), or null if no date. */
export function daysLeft(endDate: string, today: Date = new Date()): number | null {
  const end = parseISODate(endDate);
  if (!end) return null;
  const ms = end.getTime() - startOfDay(today).getTime();
  return Math.round(ms / 86_400_000);
}

/** Pending until activated; then Active until the end date has passed. */
export function statusOf(item: WarrantyItem, today: Date = new Date()): WarrantyStatus {
  if (!item.activated) return "pending";
  const left = daysLeft(item.endDate, today);
  if (left !== null && left < 0) return "inactive";
  return "active";
}

/** Active items with reminders on whose end date is within their reminder window. */
export function dueSoon(items: WarrantyItem[], today: Date = new Date()): WarrantyItem[] {
  return items.filter((item) => {
    if (!item.notify || statusOf(item, today) !== "active") return false;
    const left = daysLeft(item.endDate, today);
    return left !== null && left <= (item.remindDays ?? 7);
  });
}

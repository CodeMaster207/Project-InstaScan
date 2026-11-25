import type { Item, WarrantyStatus } from "./types";

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

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function twoDigitYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function validISO(y: number, m: number, d: number): string | null {
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return parseISODate(iso) ? iso : null;
}

/**
 * Turns the date formats seen on receipts into YYYY-MM-DD, or returns null.
 * Numeric dates are read day first (03/10/26 is 3 October 2026), as on Malaysian and most
 * non-US receipts. A time after the date ("03/10/26 11:08") is ignored.
 * Handles: 2026-10-03, 03/10/26, 3-10-2026, 3.10.2026, 3 Oct 2026, 3 October 26, Oct 3, 2026.
 */
export function normalizeDate(raw: string): string | null {
  const text = raw.trim().replace(/[T,]/g, " ").replace(/\s+/g, " ");

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(text);
  if (iso) return validISO(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/.exec(text);
  if (numeric) return validISO(twoDigitYear(Number(numeric[3])), Number(numeric[2]), Number(numeric[1]));

  const dayFirst = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]{3,9})\.? (\d{2}|\d{4})\b/i.exec(text);
  if (dayFirst) {
    const month = MONTHS.indexOf(dayFirst[2].slice(0, 3).toLowerCase()) + 1;
    return month ? validISO(twoDigitYear(Number(dayFirst[3])), month, Number(dayFirst[1])) : null;
  }

  const monthFirst = /^([a-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)? (\d{2}|\d{4})\b/i.exec(text);
  if (monthFirst) {
    const month = MONTHS.indexOf(monthFirst[1].slice(0, 3).toLowerCase()) + 1;
    return month ? validISO(twoDigitYear(Number(monthFirst[3])), month, Number(monthFirst[2])) : null;
  }

  return null;
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
export function statusOf(item: Pick<Item, "activated" | "endDate">, today: Date = new Date()): WarrantyStatus {
  if (!item.activated) return "pending";
  const left = daysLeft(item.endDate, today);
  if (left !== null && left < 0) return "inactive";
  return "active";
}

export interface Reminder {
  item: Item;
  kind: "warranty" | "subscription";
  /** Days until the date. Negative for an overdue subscription payment. */
  daysLeft: number;
}

/**
 * Things to remind about: active warranties nearing their end date, and active subscriptions
 * nearing (or past) their next payment. Only items with the bell on, inside their reminder window.
 */
export function dueReminders(items: Item[], today: Date = new Date()): Reminder[] {
  const out: Reminder[] = [];
  for (const item of items) {
    if (!item.notify) continue;
    const window = item.remindDays ?? 7;

    if (item.endDate && statusOf(item, today) === "active") {
      const left = daysLeft(item.endDate, today);
      if (left !== null && left <= window) out.push({ item, kind: "warranty", daysLeft: left });
    }
    if (item.isSubscription && item.subscriptionActive && item.nextPayment) {
      const left = daysLeft(item.nextPayment, today);
      if (left !== null && left <= window) out.push({ item, kind: "subscription", daysLeft: left });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

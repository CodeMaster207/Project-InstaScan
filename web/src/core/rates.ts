import { formatMoney, itemMoney, parseAmount, type Money } from "./money";
import type { Item } from "./types";

/**
 * Automatic currency conversion.
 *
 * Rates come from the European Central Bank through the free Frankfurter service (no key, no
 * account). One request returns every currency against the euro, and any pair is converted through
 * the euro. Only currency codes are ever sent, never amounts or anything about the user.
 */

export const RATES_URL = "https://api.frankfurter.dev/v1/latest";
export const RATES_MAX_AGE_MS = 12 * 60 * 60 * 1000; // ECB publishes once per working day

export interface RateTable {
  /** Date the rates were published (YYYY-MM-DD). */
  date: string;
  /** Units of each currency per 1 EUR. EUR itself is implied (1). */
  rates: Record<string, number>;
  /** When this device downloaded them (epoch ms). */
  fetchedAt: number;
}

/** The base currency to show totals in, together with the rates to get there. */
export interface Converter {
  base: string;
  table: RateTable;
}

/** Checks and shapes a service reply. Returns null for anything unexpected. */
export function parseRates(json: unknown, now: number = Date.now()): RateTable | null {
  if (!json || typeof json !== "object") return null;
  const data = json as { date?: unknown; rates?: unknown };
  if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return null;
  if (!data.rates || typeof data.rates !== "object") return null;

  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(data.rates as Record<string, unknown>)) {
    if (/^[A-Z]{3}$/.test(code) && typeof value === "number" && Number.isFinite(value) && value > 0) {
      rates[code] = value;
    }
  }
  if (Object.keys(rates).length === 0) return null;
  return { date: data.date, rates, fetchedAt: now };
}

export function isFresh(table: RateTable | null, now: number = Date.now()): boolean {
  return table !== null && now - table.fetchedAt < RATES_MAX_AGE_MS;
}

function perEuro(code: string, table: RateTable): number | null {
  if (code === "EUR") return 1;
  return table.rates[code] ?? null;
}

export function canConvert(from: string, to: string, table: RateTable): boolean {
  return from === to || (perEuro(from, table) !== null && perEuro(to, table) !== null);
}

/** Converts an amount between currencies, or returns null when a currency has no rate. */
export function convert(value: number, from: string, to: string, table: RateTable): number | null {
  if (from === to) return value;
  const fromRate = perEuro(from, table);
  const toRate = perEuro(to, table);
  if (fromRate === null || toRate === null) return null;
  return (value / fromRate) * toRate;
}

export interface ConvertedTotal {
  total: number;
  /** How many items were added into the total. */
  counted: number;
  /** How many of those were in another currency and had to be converted. */
  converted: number;
  /** Items left out because their currency has no rate (or no currency). */
  skipped: Pick<Item, "amount" | "name">[];
}

/** Adds items together in the converter's base currency. */
export function totalIn(items: Pick<Item, "amount" | "name">[], converter: Converter): ConvertedTotal {
  const result: ConvertedTotal = { total: 0, counted: 0, converted: 0, skipped: [] };
  for (const item of items) {
    const money = itemMoney(item);
    if (!money) continue;
    const value = convert(money.value, money.currency, converter.base, converter.table);
    if (value === null) {
      result.skipped.push(item);
      continue;
    }
    result.total += value;
    result.counted += 1;
    if (money.currency !== converter.base) result.converted += 1;
  }
  return result;
}

/** One item's amount in the base currency, or null if it is already there or cannot be converted. */
export function convertedMoney(item: Pick<Item, "amount">, converter: Converter): Money | null {
  const money = itemMoney(item);
  if (!money || money.currency === converter.base) return null;
  const value = convert(money.value, money.currency, converter.base, converter.table);
  return value === null ? null : { currency: converter.base, value };
}

/** "≈ RM 98.20" for an amount in another currency, or null when no conversion applies. */
export function approxText(item: Pick<Item, "amount">, converter: Converter | null): string | null {
  if (!converter) return null;
  const money = convertedMoney(item, converter);
  return money ? `≈ ${formatMoney(money.value, money.currency)}` : null;
}

/** Every currency that has a rate, the euro included, in alphabetical order. */
export function convertibleCurrencies(table: RateTable): string[] {
  return ["EUR", ...Object.keys(table.rates).filter((code) => code !== "EUR")].sort();
}

export interface ConvertedAmount {
  /** The new canonical amount text, for example "RM 102.27". */
  amount: string;
  /** What it was before, for example "USD 25.00". */
  original: string;
}

/**
 * Converts an amount the user typed (or the AI read) into another currency.
 * Returns null when the text is not an amount, is already in that currency, or has no rate.
 */
export function convertAmountText(
  amountText: string,
  defaultCurrency: string,
  to: string,
  table: RateTable,
): ConvertedAmount | null {
  const money = parseAmount(amountText, defaultCurrency);
  if (!money || money.currency === to) return null;
  const value = convert(money.value, money.currency, to, table);
  if (value === null) return null;
  return { amount: formatMoney(value, to), original: formatMoney(money.value, money.currency) };
}

/** Downloads the latest rates. Throws on a network error or an unexpected reply. */
export async function fetchRates(): Promise<RateTable> {
  const response = await fetch(RATES_URL, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Rate service answered ${response.status}`);
  const table = parseRates(await response.json());
  if (!table) throw new Error("Unexpected reply from the rate service");
  return table;
}

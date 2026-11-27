import type { Item } from "./types";

export interface Money {
  /** Normalised currency key, for example "MYR", "USD", "$" or "" when none was given. */
  currency: string;
  value: number;
}

/**
 * Symbols and local spellings mapped to ISO codes, so they group and convert correctly.
 * A bare "$" is read as US dollars (it could also be SGD, AUD and others: the user can retype it).
 */
const ALIASES: Record<string, string> = {
  RM: "MYR",
  "$": "USD",
  "US$": "USD",
  "S$": "SGD",
  "A$": "AUD",
  "C$": "CAD",
  "HK$": "HKD",
  "NZ$": "NZD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  RMB: "CNY",
};

export function currencyKey(raw: string): string {
  const key = raw.trim().toUpperCase().replace(/\.$/, "");
  return ALIASES[key] ?? key;
}

/**
 * Reads amounts the way people write them: "RM 12.50", "RM12.50", "12.50 MYR", "$9.99",
 * "1,234.50". Returns null when there is no usable number. A bare number gets `fallbackCurrency`.
 */
export function parseAmount(text: string, fallbackCurrency = ""): Money | null {
  const match = /^\s*([A-Za-z$€£¥]{0,4}\.?)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*([A-Za-z]{2,3})?\s*$/.exec(text);
  if (!match) return null;
  const value = Number(match[2].replace(/,/g, ""));
  if (!Number.isFinite(value) || value < 0) return null;
  const currency = currencyKey(match[1] || match[3] || fallbackCurrency);
  return { currency, value };
}

/** "MYR" is shown as "RM", as in the design drafts. */
export function formatMoney(value: number, currency: string): string {
  const label = currency === "MYR" ? "RM" : currency;
  const number = value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return label ? `${label} ${number}` : number;
}

/** Turns what the user typed into the canonical "RM 12.50" form, or null if it is not an amount. */
export function normalizeAmount(text: string, defaultCurrency: string): string | null {
  if (text.trim() === "") return "";
  const money = parseAmount(text, defaultCurrency);
  return money ? formatMoney(money.value, money.currency) : null;
}

export function itemMoney(item: Pick<Item, "amount">): Money | null {
  return item.amount ? parseAmount(item.amount) : null;
}

/** Totals per currency, so different currencies are never added together. */
export function sumByCurrency(items: Pick<Item, "amount">[]): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const money = itemMoney(item);
    if (!money) continue;
    totals.set(money.currency, (totals.get(money.currency) ?? 0) + money.value);
  }
  return [...totals.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);
}

// Run with: npm test   (uses node:test through tsx, no browser needed)
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCategory } from "./categories";
import { toCSV } from "./csv";
import { addMonths, daysLeft, dueReminders, normalizeDate, parseISODate, statusOf } from "./deadlines";
import { isOrphan, makeItem, migrateItem } from "./items";
import { mergeItems, type RemoteDoc } from "./merge";
import { formatMoney, normalizeAmount, parseAmount, sumByCurrency } from "./money";
import { inPeriod, periodLabel } from "./periods";
import { rejectReason } from "./validate";

const NOW = new Date(2026, 10, 25); // 25 Nov 2026

describe("money", () => {
  it("parses the ways people write amounts", () => {
    assert.deepEqual(parseAmount("RM 12.50"), { currency: "MYR", value: 12.5 });
    assert.deepEqual(parseAmount("RM12.50"), { currency: "MYR", value: 12.5 });
    assert.deepEqual(parseAmount("12.50 MYR"), { currency: "MYR", value: 12.5 });
    assert.deepEqual(parseAmount("$9.99"), { currency: "$", value: 9.99 });
    assert.deepEqual(parseAmount("USD 1,234.50"), { currency: "USD", value: 1234.5 });
    assert.deepEqual(parseAmount("30", "RM"), { currency: "MYR", value: 30 });
  });

  it("rejects things that are not amounts", () => {
    assert.equal(parseAmount("free"), null);
    assert.equal(parseAmount(""), null);
    assert.equal(parseAmount("-5"), null);
    assert.equal(parseAmount("12.5.3"), null);
  });

  it("formats MYR as RM and normalises typed text", () => {
    assert.equal(formatMoney(1234.5, "MYR"), "RM 1,234.50");
    assert.equal(formatMoney(5, "USD"), "USD 5.00");
    assert.equal(normalizeAmount("12.5", "RM"), "RM 12.50");
    assert.equal(normalizeAmount("", "RM"), "");
    assert.equal(normalizeAmount("abc", "RM"), null);
  });

  it("never adds different currencies together", () => {
    const totals = sumByCurrency([
      { amount: "RM 10.00" },
      { amount: "MYR 5.50" },
      { amount: "USD 3.00" },
      { amount: "" },
      { amount: "nonsense" },
    ]);
    assert.deepEqual(totals, [
      { currency: "MYR", total: 15.5 },
      { currency: "USD", total: 3 },
    ]);
  });
});

describe("periods", () => {
  it("filters by day, month and year", () => {
    assert.equal(inPeriod("2026-11-25", "today", NOW), true);
    assert.equal(inPeriod("2026-11-24", "today", NOW), false);
    assert.equal(inPeriod("2026-11-01", "month", NOW), true);
    assert.equal(inPeriod("2026-10-31", "month", NOW), false);
    assert.equal(inPeriod("2026-01-02", "year", NOW), true);
    assert.equal(inPeriod("2025-12-31", "year", NOW), false);
    assert.equal(inPeriod("", "all", NOW), true);
    assert.equal(inPeriod("", "month", NOW), false);
  });

  it("labels periods with correct ordinals", () => {
    assert.equal(periodLabel("today", new Date(2026, 8, 27)), "Today (27th September 2026)");
    assert.equal(periodLabel("today", new Date(2026, 8, 1)), "Today (1st September 2026)");
    assert.equal(periodLabel("today", new Date(2026, 8, 2)), "Today (2nd September 2026)");
    assert.equal(periodLabel("today", new Date(2026, 8, 3)), "Today (3rd September 2026)");
    assert.equal(periodLabel("today", new Date(2026, 8, 11)), "Today (11th September 2026)");
    assert.equal(periodLabel("today", new Date(2026, 8, 21)), "Today (21st September 2026)");
    assert.equal(periodLabel("month", NOW), "November 2026");
    assert.equal(periodLabel("year", NOW), "2026");
  });
});

describe("csv", () => {
  it("quotes cells with commas, quotes and line breaks", () => {
    const csv = toCSV(["name", "note"], [["Phone, case", 'say "hi"'], ["a", "line1\nline2"]]);
    assert.equal(csv, 'name,note\r\n"Phone, case","say ""hi"""\r\na,"line1\nline2"\r\n');
  });

  it("neutralises spreadsheet formulas", () => {
    const csv = toCSV(["x"], [["=HYPERLINK(\"http://evil\")"], ["+1"], ["-1"], ["@SUM(A1)"], [-5], ["safe"]]);
    const lines = csv.trim().split("\r\n");
    assert.equal(lines[1].startsWith(`"'=`), true);
    assert.equal(lines[2], "'+1");
    assert.equal(lines[3], "'-1");
    assert.equal(lines[4], "'@SUM(A1)");
    assert.equal(lines[5], "-5"); // a real number stays a number
    assert.equal(lines[6], "safe");
  });
});

describe("categories", () => {
  it("maps AI text to known categories", () => {
    assert.equal(normalizeCategory("groceries"), "Groceries");
    assert.equal(normalizeCategory("Food and drink"), "Food & drink");
    assert.equal(normalizeCategory("Bills and subscriptions"), "Bills & subscriptions");
    assert.equal(normalizeCategory("food & drink"), "Food & drink");
    assert.equal(normalizeCategory("electronics store"), "Electronics");
    assert.equal(normalizeCategory(""), "Other");
    assert.equal(normalizeCategory(undefined), "Other");
    assert.equal(normalizeCategory("???"), "Other");
  });
});

describe("dates", () => {
  it("normalises receipt dates, day first", () => {
    assert.equal(normalizeDate("03/10/26 11:08"), "2026-10-03");
    assert.equal(normalizeDate("3 Oct 2026"), "2026-10-03");
    assert.equal(normalizeDate("31/02/26"), null);
  });
  it("adds months with month-end clamping", () => {
    assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonths("2026-11-25", 12), "2027-11-25");
  });
  it("counts days and reports status", () => {
    assert.equal(daysLeft("2026-11-25", NOW), 0);
    assert.equal(daysLeft("2026-11-24", NOW), -1);
    assert.equal(parseISODate("2026-02-30"), null);
    assert.equal(statusOf({ activated: false, endDate: "2027-01-01" }, NOW), "pending");
    assert.equal(statusOf({ activated: true, endDate: "2026-11-24" }, NOW), "inactive");
    assert.equal(statusOf({ activated: true, endDate: "2026-11-25" }, NOW), "active");
  });
});

describe("validation router", () => {
  it("accepts a complete read and rejects incomplete ones", () => {
    assert.equal(rejectReason({ itemName: "Phone", purchaseDate: "2026-10-03", total: 12.5 }), null);
    assert.equal(rejectReason({ itemName: "Phone", total: 12.5 }), "no valid purchase date");
    assert.equal(rejectReason({ itemName: "Phone", purchaseDate: "2026-10-03" }), "no valid total");
    assert.equal(rejectReason({ purchaseDate: "2026-10-03", total: 5 }), "no merchant or item name found");
    assert.equal(rejectReason(null), "the answer could not be read");
  });
});

describe("items", () => {
  it("migrates items saved by the first version of the app", () => {
    const old = {
      id: "a1",
      name: "Rice cooker",
      amount: "RM 199.00",
      endDate: "2027-01-01",
      provider: "",
      nextPayment: "2026-12-01",
      discountPercent: "",
      discountPeriod: "",
      remindDays: 7,
      activated: true,
      notify: true,
      source: "cloud",
    };
    const item = migrateItem(old, NOW);
    assert.ok(item);
    assert.equal(item.isExpense, true);
    assert.equal(item.isSubscription, true); // had a next payment date
    assert.equal(item.subscriptionActive, true);
    assert.equal(item.category, "Other");
    assert.equal(item.hasReceiptImage, false);
    assert.equal(item.addedAt, "2026-11-25");
  });

  it("drops unusable data", () => {
    assert.equal(migrateItem(null), null);
    assert.equal(migrateItem({ id: "x" }), null);
    assert.equal(migrateItem({ name: "no id" }), null);
    assert.equal(migrateItem("text"), null);
  });

  it("knows when an item has no page left", () => {
    assert.equal(isOrphan({ isExpense: false, isSubscription: false, endDate: "" }), true);
    assert.equal(isOrphan({ isExpense: false, isSubscription: true, endDate: "" }), false);
    assert.equal(isOrphan({ isExpense: false, isSubscription: false, endDate: "2027-01-01" }), false);
    assert.equal(isOrphan({ isExpense: true, isSubscription: false, endDate: "" }), false);
  });
});

describe("reminders", () => {
  it("lists warranties and subscriptions inside their window", () => {
    const warranty = makeItem({ name: "TV", endDate: "2026-11-28", activated: true, notify: true, remindDays: 7 }, NOW);
    const farWarranty = makeItem({ name: "Fridge", endDate: "2027-06-01", activated: true, notify: true }, NOW);
    const muted = makeItem({ name: "Fan", endDate: "2026-11-27", activated: true, notify: false }, NOW);
    const pending = makeItem({ name: "Kettle", endDate: "2026-11-27", activated: false, notify: true }, NOW);
    const sub = makeItem(
      { name: "Gym", isSubscription: true, nextPayment: "2026-11-24", notify: true, remindDays: 3 },
      NOW,
    );
    const pausedSub = makeItem(
      { name: "Music", isSubscription: true, subscriptionActive: false, nextPayment: "2026-11-26", notify: true },
      NOW,
    );
    const result = dueReminders([warranty, farWarranty, muted, pending, sub, pausedSub], NOW);
    assert.deepEqual(
      result.map((r) => [r.item.name, r.kind, r.daysLeft]),
      [["Gym", "subscription", -1], ["TV", "warranty", 3]],
    );
  });
});

describe("sync merge", () => {
  const at = (name: string, id: string, updatedAt: number) => makeItem({ id, name, updatedAt }, NOW);
  const doc = (item: ReturnType<typeof at>): RemoteDoc => ({ id: item.id, updatedAt: item.updatedAt, item });
  const gone = (id: string, updatedAt: number): RemoteDoc => ({ id, updatedAt, deleted: true });

  it("uploads local-only items and downloads cloud-only items", () => {
    const local = [at("Local", "l", 10)];
    const remote = [doc(at("Remote", "r", 20))];
    const result = mergeItems(local, remote, {});
    assert.deepEqual(result.items.map((i) => i.id).sort(), ["l", "r"]);
    assert.deepEqual(result.upload.map((i) => i.id), ["l"]);
    assert.equal(result.localChanged, true);
  });

  it("keeps the newer copy of an item edited in two places", () => {
    const newerLocal = mergeItems([at("Local v2", "x", 30)], [doc(at("Cloud v1", "x", 20))], {});
    assert.equal(newerLocal.items[0].name, "Local v2");
    assert.deepEqual(newerLocal.upload.map((i) => i.name), ["Local v2"]);
    assert.equal(newerLocal.localChanged, false);

    const newerCloud = mergeItems([at("Local v1", "x", 10)], [doc(at("Cloud v2", "x", 20))], {});
    assert.equal(newerCloud.items[0].name, "Cloud v2");
    assert.equal(newerCloud.upload.length, 0);
    assert.equal(newerCloud.localChanged, true);
  });

  it("makes no changes when both sides already agree (so syncing stops)", () => {
    const item = at("Same", "s", 10);
    const result = mergeItems([item], [doc(item)], {});
    assert.equal(result.localChanged, false);
    assert.equal(result.upload.length, 0);
    assert.equal(result.uploadDeletes.length, 0);
  });

  it("applies a newer delete from another device", () => {
    const result = mergeItems([at("Old", "d", 10)], [gone("d", 20)], {});
    assert.equal(result.items.length, 0);
    assert.equal(result.localChanged, true);
    assert.equal(result.tombstones.d, 20);
  });

  it("keeps an item edited after it was deleted elsewhere", () => {
    const result = mergeItems([at("Edited later", "d", 30)], [gone("d", 20)], {});
    assert.equal(result.items.length, 1);
    assert.deepEqual(result.upload.map((i) => i.id), ["d"]);
    assert.equal(result.tombstones.d, undefined);
  });

  it("sends a local delete to the cloud, and a later cloud edit brings the item back", () => {
    const deleted = mergeItems([], [doc(at("Cloud", "z", 10))], { z: 20 });
    assert.equal(deleted.items.length, 0);
    assert.deepEqual(deleted.uploadDeletes, [{ id: "z", deletedAt: 20 }]);

    const revived = mergeItems([], [doc(at("Cloud edited", "z", 30))], { z: 20 });
    assert.equal(revived.items.length, 1);
    assert.equal(revived.tombstones.z, undefined);
  });

  it("reports deletions the cloud has not seen", () => {
    const result = mergeItems([], [], { q: 5 });
    assert.deepEqual(result.uploadDeletes, [{ id: "q", deletedAt: 5 }]);
  });
});

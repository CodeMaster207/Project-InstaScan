/**
 * Turns rows into CSV text.
 * - Quotes cells that contain commas, quotes or line breaks.
 * - Neutralises "formula injection": a cell starting with = + - @ would run as a formula when the
 *   file is opened in a spreadsheet, and receipt text is untrusted, so such cells get a leading '.
 */
export function toCSV(columns: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const cell = (value: string | number | boolean | null | undefined): string => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text) && typeof value !== "number") text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** Saves text as a file in the browser (UTF-8 with a BOM so spreadsheets read accents correctly). */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

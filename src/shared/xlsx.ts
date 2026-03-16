import * as XLSX from "xlsx";
import type { Contact } from "./models";

function normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalized = key.toLowerCase().trim().replace(/\s+/g, "_");
    out[normalized] = value;
  });
  return out;
}

function isTagged(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();
  return text === "1" || (!Number.isNaN(parseInt(text)) && parseInt(text) >= 1) || text === "si" || text === "true" || text === "yes" || text === "x";
}

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizePhoneCell(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Excel can export numeric cells as 5491122334455 or 5.491122334455E+12.
  if (/^[0-9]+\.?0*$/.test(raw)) {
    return raw.replace(/\.0+$/, "");
  }

  return raw;
}

function mapSpreadsheetRow(row: Record<string, unknown>): Contact | null {
  const r = normalizeRowKeys(row);
  const id = toStringValue(r["id"]) || `contact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const name = toStringValue(
    r["fullname"] ?? r["full_name"] ?? r["name"] ?? r["nombre"],
  );
  const phone = normalizePhoneCell(
    r["mobile_phone"] ??
      r["mobile_1"] ??
      r["mobile"] ??
      r["phone"] ??
      r["phone_number"] ??
      r["telefono"],
  );
  const email = toStringValue(r["email"]) || undefined;

  if (!name || !phone) return null;

  const reserved = new Set(["id", "reg", "full_name", "name", "mobile_phone", "mobile_1", "phone", "email", "__empty", "__empty_1"]);
  const tags = Object.entries(r)
    .filter(([k, v]) => !reserved.has(k) && isTagged(v))
    .map(([k]) => k.replace(/^tag[_-]?/, "").trim())
    .filter(Boolean);

  return {
    id,
    name,
    phone,
    email,
    tags: Array.from(new Set(tags)).sort(),
    createdAt: new Date().toISOString(),
  };
}

export async function parseContactsFromXlsx(file: File): Promise<Contact[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rows
    .map(mapSpreadsheetRow)
    .filter((contact): contact is Contact => !!contact);
}

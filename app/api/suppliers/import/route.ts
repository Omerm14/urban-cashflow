import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createSupplier, getSuppliers } from "@/lib/store";

interface SupplierRow {
  name?: string;
  aliases?: string;
  payment_term_type?: string;
  payment_term_days?: string | number;
  notes?: string;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: SupplierRow[] = [];

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const text = buffer.toString("utf-8");
    const lines = text.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, values[i]])) as SupplierRow;
    });
  } else {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<SupplierRow>(ws);
  }

  const existing = await getSuppliers();
  const existingNames = new Set(existing.map((s) => s.name.toLowerCase()));

  let inserted = 0;
  for (const row of rows) {
    if (!row.name) continue;
    if (existingNames.has(row.name.toLowerCase())) continue;
    const aliases = row.aliases
      ? row.aliases.split(";").map((a) => a.trim()).filter(Boolean)
      : [];
    await createSupplier({
      name: row.name,
      aliases,
      payment_term_type:
        (row.payment_term_type as "shotef_plus" | "shotef" | "immediate" | "custom") ??
        "shotef_plus",
      payment_term_days: row.payment_term_days ? Number(row.payment_term_days) : null,
      notes: row.notes ?? null,
    });
    existingNames.add(row.name.toLowerCase());
    inserted++;
  }

  return NextResponse.json({ inserted });
}

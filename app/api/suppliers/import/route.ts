import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sql } from "@/lib/db";

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

  const inserted: unknown[] = [];
  for (const row of rows) {
    if (!row.name) continue;
    const aliases = row.aliases
      ? row.aliases.split(";").map((a) => a.trim()).filter(Boolean)
      : [];
    const termType = row.payment_term_type ?? "shotef_plus";
    const termDays = row.payment_term_days ? Number(row.payment_term_days) : null;

    const aliasesLiteral = `{${aliases.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(",")}}`;
    const { rows: r } = await sql`
      INSERT INTO suppliers (name, aliases, payment_term_type, payment_term_days, notes)
      VALUES (${row.name}, ${aliasesLiteral}::text[], ${termType}, ${termDays}, ${row.notes ?? null})
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    if (r[0]) inserted.push(r[0]);
  }

  return NextResponse.json({ inserted: inserted.length });
}

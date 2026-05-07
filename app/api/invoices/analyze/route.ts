import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { extractInvoiceFromUrl } from "@/lib/claude";
import { sql } from "@/lib/db";
import { matchSupplier } from "@/lib/supplier-match";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Upload to Vercel Blob
  const blob = await put(`invoices/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  // Run OCR
  const extracted = await extractInvoiceFromUrl(blob.url);

  // Try to match supplier
  const { rows: suppliers } = await sql`SELECT id, name, aliases FROM suppliers`;
  const match = extracted.supplier_name
    ? matchSupplier(extracted.supplier_name, suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        aliases: s.aliases ?? [],
      })))
    : null;

  return NextResponse.json({
    image_url: blob.url,
    extracted,
    matched_supplier: match
      ? { id: match.supplier.id, name: match.supplier.name, score: match.score }
      : null,
  });
}

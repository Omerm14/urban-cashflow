import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceFromBase64 } from "@/lib/claude";
import { getSuppliers } from "@/lib/store";
import { matchSupplier } from "@/lib/supplier-match";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const mediaType = (file.type || "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const extracted = await extractInvoiceFromBase64(base64, mediaType);

  const suppliers = await getSuppliers();
  const match = extracted.supplier_name
    ? matchSupplier(extracted.supplier_name, suppliers)
    : null;

  return NextResponse.json({
    extracted,
    matched_supplier: match
      ? { id: match.supplier.id, name: match.supplier.name, score: match.score }
      : null,
  });
}

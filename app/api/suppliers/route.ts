import { NextRequest, NextResponse } from "next/server";
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await getSuppliers());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, aliases = [], payment_term_type, payment_term_days, notes } = body;
  const supplier = await createSupplier({
    name,
    aliases,
    payment_term_type,
    payment_term_days: payment_term_days ?? null,
    notes: notes ?? null,
  });
  return NextResponse.json(supplier, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, aliases, payment_term_type, payment_term_days, notes } = body;
  const supplier = await updateSupplier(id, {
    name,
    aliases: aliases ?? [],
    payment_term_type,
    payment_term_days: payment_term_days ?? null,
    notes: notes ?? null,
  });
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteSupplier(id);
  return NextResponse.json({ ok: true });
}

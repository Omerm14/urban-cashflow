import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await sql`
    SELECT i.*, s.name AS supplier_name, s.payment_term_type, s.payment_term_days
    FROM invoices i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.id = ${id}
  `;
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

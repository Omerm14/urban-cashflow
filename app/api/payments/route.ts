import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getPaymentMonth } from "@/lib/payment-terms";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const status = searchParams.get("status");

  let rows;
  if (month && status) {
    ({ rows } = await sql`
      SELECT p.*, s.name AS supplier_name, i.invoice_number, i.invoice_date, i.image_url
      FROM payments p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.payment_month = ${month} AND p.status = ${status}
      ORDER BY COALESCE(p.overridden_due_date, p.calculated_due_date)
    `);
  } else if (month) {
    ({ rows } = await sql`
      SELECT p.*, s.name AS supplier_name, i.invoice_number, i.invoice_date, i.image_url
      FROM payments p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.payment_month = ${month}
      ORDER BY COALESCE(p.overridden_due_date, p.calculated_due_date)
    `);
  } else {
    ({ rows } = await sql`
      SELECT p.*, s.name AS supplier_name, i.invoice_number, i.invoice_date, i.image_url
      FROM payments p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN invoices i ON p.invoice_id = i.id
      ORDER BY p.payment_month, COALESCE(p.overridden_due_date, p.calculated_due_date)
    `);
  }

  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, overridden_due_date, override_reason, status } = body;

  let rows;
  if (overridden_due_date !== undefined) {
    const newMonth = overridden_due_date ? getPaymentMonth(new Date(overridden_due_date)) : null;
    ({ rows } = await sql`
      UPDATE payments
      SET overridden_due_date = ${overridden_due_date ?? null},
          override_reason = ${override_reason ?? null},
          payment_month = COALESCE(${newMonth}, payment_month),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
  } else if (status !== undefined) {
    ({ rows } = await sql`
      UPDATE payments SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
  } else {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  return NextResponse.json(rows[0]);
}

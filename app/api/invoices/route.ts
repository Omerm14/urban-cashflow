import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { calculateDueDate, getPaymentMonth } from "@/lib/payment-terms";

export async function GET() {
  const { rows } = await sql`
    SELECT i.*, s.name AS supplier_name
    FROM invoices i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    ORDER BY i.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    supplier_id,
    invoice_number,
    invoice_date,
    amount,
    currency = "ILS",
    description,
    image_url,
    drive_file_id,
    raw_ocr_json,
    status = "pending_review",
  } = body;

  const { rows } = await sql`
    INSERT INTO invoices
      (supplier_id, invoice_number, invoice_date, amount, currency, description,
       image_url, drive_file_id, raw_ocr_json, status)
    VALUES
      (${supplier_id ?? null}, ${invoice_number ?? null}, ${invoice_date ?? null},
       ${amount ?? null}, ${currency}, ${description ?? null},
       ${image_url ?? null}, ${drive_file_id ?? null},
       ${raw_ocr_json ? JSON.stringify(raw_ocr_json) : null}, ${status})
    RETURNING *
  `;

  return NextResponse.json(rows[0], { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, supplier_id, invoice_number, invoice_date, amount, currency, description, status } = body;

  const { rows } = await sql`
    UPDATE invoices
    SET supplier_id = ${supplier_id ?? null},
        invoice_number = ${invoice_number ?? null},
        invoice_date = ${invoice_date ?? null},
        amount = ${amount ?? null},
        currency = ${currency ?? "ILS"},
        description = ${description ?? null},
        status = ${status ?? "pending_review"}
    WHERE id = ${id}
    RETURNING *
  `;

  const invoice = rows[0];

  // If confirming, create/update the payment record
  if (status === "confirmed" && supplier_id && invoice_date && amount) {
    const { rows: suppliers } = await sql`SELECT * FROM suppliers WHERE id = ${supplier_id}`;
    const supplier = suppliers[0];
    if (supplier) {
      const due = calculateDueDate(new Date(invoice_date), {
        type: supplier.payment_term_type,
        days: supplier.payment_term_days ?? undefined,
      });
      const paymentMonth = getPaymentMonth(due);

      // Upsert payment
      await sql`
        INSERT INTO payments (invoice_id, supplier_id, calculated_due_date, payment_month, amount, status)
        VALUES (${id}, ${supplier_id}, ${due.toISOString().split("T")[0]}, ${paymentMonth}, ${amount}, 'scheduled')
        ON CONFLICT (invoice_id) DO UPDATE
          SET supplier_id = EXCLUDED.supplier_id,
              calculated_due_date = EXCLUDED.calculated_due_date,
              payment_month = EXCLUDED.payment_month,
              amount = EXCLUDED.amount,
              updated_at = NOW()
      `;
    }
  }

  return NextResponse.json(invoice);
}

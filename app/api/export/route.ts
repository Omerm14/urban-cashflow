import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { buildPaymentsWorkbook } from "@/lib/excel";

export async function GET() {
  const { rows } = await sql`
    SELECT p.payment_month, p.amount, p.overridden_due_date, p.override_reason,
           s.name AS supplier_name,
           i.invoice_date, i.invoice_number, i.image_url, i.currency
    FROM payments p
    JOIN suppliers s ON p.supplier_id = s.id
    JOIN invoices i ON p.invoice_id = i.id
    ORDER BY p.payment_month, COALESCE(p.overridden_due_date, p.calculated_due_date)
  `;

  const buf = buildPaymentsWorkbook(rows.map((r) => ({
    supplier_name: r.supplier_name,
    amount: Number(r.amount),
    currency: r.currency ?? "ILS",
    invoice_date: r.invoice_date,
    invoice_number: r.invoice_number,
    image_url: r.image_url,
    payment_month: r.payment_month,
    overridden_due_date: r.overridden_due_date,
    override_reason: r.override_reason,
  })));

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}

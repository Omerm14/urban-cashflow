import { NextResponse } from "next/server";
import { getInvoices, getPayments, getSuppliers } from "@/lib/store";
import { buildPaymentsWorkbook } from "@/lib/excel";

export async function GET() {
  const [payments, invoices, suppliers] = await Promise.all([
    getPayments(),
    getInvoices(),
    getSuppliers(),
  ]);

  const invoiceMap = Object.fromEntries(invoices.map((i) => [i.id, i]));
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));

  const rows = payments
    .sort((a, b) => {
      const da = a.overridden_due_date ?? a.calculated_due_date;
      const db = b.overridden_due_date ?? b.calculated_due_date;
      return a.payment_month.localeCompare(b.payment_month) || da.localeCompare(db);
    })
    .map((p) => ({
      supplier_name: supplierMap[p.supplier_id]?.name ?? "Unknown",
      amount: Number(p.amount),
      currency: invoiceMap[p.invoice_id]?.currency ?? "ILS",
      invoice_date: invoiceMap[p.invoice_id]?.invoice_date ?? null,
      invoice_number: invoiceMap[p.invoice_id]?.invoice_number ?? null,
      payment_month: p.payment_month,
      overridden_due_date: p.overridden_due_date,
      override_reason: p.override_reason,
    }));

  const buf = buildPaymentsWorkbook(rows);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}

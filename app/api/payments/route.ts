import { NextRequest, NextResponse } from "next/server";
import { getInvoices, getPayments, getSuppliers, updatePayment } from "@/lib/store";
import { getPaymentMonth } from "@/lib/payment-terms";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const status = searchParams.get("status");

  const [payments, invoices, suppliers] = await Promise.all([
    getPayments(),
    getInvoices(),
    getSuppliers(),
  ]);

  const invoiceMap = Object.fromEntries(invoices.map((i) => [i.id, i]));
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));

  let result = payments.map((p) => ({
    ...p,
    supplier_name: supplierMap[p.supplier_id]?.name ?? "Unknown",
    invoice_number: invoiceMap[p.invoice_id]?.invoice_number ?? null,
    invoice_date: invoiceMap[p.invoice_id]?.invoice_date ?? null,
  }));

  if (month) result = result.filter((p) => p.payment_month === month);
  if (status) result = result.filter((p) => p.status === status);

  result.sort((a, b) => {
    const da = a.overridden_due_date ?? a.calculated_due_date;
    const db = b.overridden_due_date ?? b.calculated_due_date;
    return da.localeCompare(db);
  });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, overridden_due_date, override_reason, status } = body;

  if (overridden_due_date !== undefined) {
    const newMonth = overridden_due_date
      ? getPaymentMonth(new Date(overridden_due_date))
      : undefined;
    const payment = await updatePayment(id, {
      overridden_due_date: overridden_due_date ?? null,
      override_reason: override_reason ?? null,
      ...(newMonth ? { payment_month: newMonth } : {}),
    });
    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payment);
  }

  if (status !== undefined) {
    const payment = await updatePayment(id, { status });
    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payment);
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import {
  createInvoice,
  getInvoices,
  getSuppliers,
  updateInvoice,
  upsertPayment,
} from "@/lib/store";
import { calculateDueDate, getPaymentMonth } from "@/lib/payment-terms";

export async function GET() {
  const [invoices, suppliers] = await Promise.all([getInvoices(), getSuppliers()]);
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));

  return NextResponse.json(
    invoices.map((inv) => ({
      ...inv,
      supplier_name: inv.supplier_id ? supplierMap[inv.supplier_id]?.name ?? null : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    supplier_id = null,
    invoice_number = null,
    invoice_date = null,
    amount = null,
    currency = "ILS",
    description = null,
    status = "pending_review",
  } = body;

  const invoice = await createInvoice({
    supplier_id,
    invoice_number,
    invoice_date,
    amount,
    currency,
    description,
    status,
  });

  return NextResponse.json(invoice, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, supplier_id, invoice_number, invoice_date, amount, currency, description, status } =
    body;

  const invoice = await updateInvoice(id, {
    supplier_id: supplier_id ?? null,
    invoice_number: invoice_number ?? null,
    invoice_date: invoice_date ?? null,
    amount: amount ?? null,
    currency: currency ?? "ILS",
    description: description ?? null,
    status: status ?? "pending_review",
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "confirmed" && supplier_id && invoice_date && amount) {
    const suppliers = await getSuppliers();
    const supplier = suppliers.find((s) => s.id === supplier_id);
    if (supplier) {
      const due = calculateDueDate(new Date(invoice_date), {
        type: supplier.payment_term_type,
        days: supplier.payment_term_days ?? undefined,
      });
      const paymentMonth = getPaymentMonth(due);
      await upsertPayment(id, {
        invoice_id: id,
        supplier_id,
        calculated_due_date: due.toISOString().split("T")[0],
        payment_month: paymentMonth,
        amount: Number(amount),
        status: "scheduled",
        overridden_due_date: null,
        override_reason: null,
      });
    }
  }

  return NextResponse.json(invoice);
}

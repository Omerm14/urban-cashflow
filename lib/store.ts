import { kv } from "@vercel/kv";

export interface Supplier {
  id: string;
  name: string;
  aliases: string[];
  payment_term_type: "shotef_plus" | "shotef" | "immediate" | "custom";
  payment_term_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  supplier_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: number | null;
  currency: string;
  description: string | null;
  status: "pending_review" | "confirmed" | "processed";
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  supplier_id: string;
  calculated_due_date: string;
  overridden_due_date: string | null;
  override_reason: string | null;
  payment_month: string;
  amount: number;
  status: "scheduled" | "paid";
  updated_at: string;
}

async function getMap<T>(key: string): Promise<Record<string, T>> {
  return (await kv.get<Record<string, T>>(key)) ?? {};
}

// ---- SUPPLIERS ----

export async function getSuppliers(): Promise<Supplier[]> {
  const map = await getMap<Supplier>("suppliers");
  return Object.values(map).sort((a, b) =>
    a.name.localeCompare(b.name, "he")
  );
}

export async function createSupplier(
  data: Omit<Supplier, "id" | "created_at">
): Promise<Supplier> {
  const map = await getMap<Supplier>("suppliers");
  const id = crypto.randomUUID();
  const supplier: Supplier = { id, ...data, created_at: new Date().toISOString() };
  map[id] = supplier;
  await kv.set("suppliers", map);
  return supplier;
}

export async function updateSupplier(
  id: string,
  data: Partial<Omit<Supplier, "id" | "created_at">>
): Promise<Supplier | null> {
  const map = await getMap<Supplier>("suppliers");
  if (!map[id]) return null;
  map[id] = { ...map[id], ...data };
  await kv.set("suppliers", map);
  return map[id];
}

export async function deleteSupplier(id: string): Promise<void> {
  const map = await getMap<Supplier>("suppliers");
  delete map[id];
  await kv.set("suppliers", map);
}

// ---- INVOICES ----

export async function getInvoices(): Promise<Invoice[]> {
  const map = await getMap<Invoice>("invoices");
  return Object.values(map).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

export async function createInvoice(
  data: Omit<Invoice, "id" | "created_at">
): Promise<Invoice> {
  const map = await getMap<Invoice>("invoices");
  const id = crypto.randomUUID();
  const invoice: Invoice = { id, ...data, created_at: new Date().toISOString() };
  map[id] = invoice;
  await kv.set("invoices", map);
  return invoice;
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "id" | "created_at">>
): Promise<Invoice | null> {
  const map = await getMap<Invoice>("invoices");
  if (!map[id]) return null;
  map[id] = { ...map[id], ...data };
  await kv.set("invoices", map);
  return map[id];
}

export async function deleteInvoice(id: string): Promise<void> {
  const invoices = await getMap<Invoice>("invoices");
  delete invoices[id];
  await kv.set("invoices", invoices);
  const payments = await getMap<Payment>("payments");
  for (const pid of Object.keys(payments)) {
    if (payments[pid].invoice_id === id) delete payments[pid];
  }
  await kv.set("payments", payments);
}

// ---- PAYMENTS ----

export async function getPayments(): Promise<Payment[]> {
  const map = await getMap<Payment>("payments");
  return Object.values(map);
}

export async function upsertPayment(
  invoiceId: string,
  data: Omit<Payment, "id" | "updated_at">
): Promise<Payment> {
  const map = await getMap<Payment>("payments");
  const existing = Object.values(map).find((p) => p.invoice_id === invoiceId);
  const id = existing?.id ?? crypto.randomUUID();
  const payment: Payment = { id, ...data, updated_at: new Date().toISOString() };
  map[id] = payment;
  await kv.set("payments", map);
  return payment;
}

export async function updatePayment(
  id: string,
  data: Partial<Omit<Payment, "id">>
): Promise<Payment | null> {
  const map = await getMap<Payment>("payments");
  if (!map[id]) return null;
  map[id] = { ...map[id], ...data, updated_at: new Date().toISOString() };
  await kv.set("payments", map);
  return map[id];
}

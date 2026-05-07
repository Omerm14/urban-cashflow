"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Invoice {
  id: number;
  supplier_id: number | null;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: number | null;
  currency: string;
  description: string | null;
  image_url: string | null;
  status: string;
  payment_term_type?: string;
  payment_term_days?: number | null;
}

interface Supplier {
  id: number;
  name: string;
  payment_term_type: string;
  payment_term_days: number | null;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<Partial<Invoice>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
    ]).then(([inv, sups]) => {
      setInvoice(inv);
      setForm(inv);
      setSuppliers(sups);
    });
  }, [id]);

  async function confirm() {
    setSaving(true);
    await fetch("/api/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: invoice!.id, status: "confirmed" }),
    });
    setSaving(false);
    router.push("/invoices");
  }

  if (!invoice) return <div className="p-6 text-slate-400">Loading…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Invoice #{invoice.invoice_number ?? id}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {invoice.image_url && (
          <div className="card">
            <img src={invoice.image_url} alt="Invoice" className="w-full rounded-lg object-contain max-h-96" />
          </div>
        )}

        <div className="card space-y-4">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Supplier</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.supplier_id ?? ""}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">— Select —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Invoice Number</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.invoice_number ?? ""} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Invoice Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.invoice_date ?? ""} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Amount</label>
            <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Description</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="pt-2 flex gap-3">
            <button onClick={confirm} disabled={saving || !form.supplier_id || !form.invoice_date || !form.amount}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Check size={16} /> Confirm & Schedule Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

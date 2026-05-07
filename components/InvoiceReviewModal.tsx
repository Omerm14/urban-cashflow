"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";

interface AnalyzeResult {
  image_url: string;
  extracted: {
    supplier_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    total_amount: number | null;
    currency: string;
    description: string | null;
  };
  matched_supplier: { id: number; name: string; score: number } | null;
}

interface Supplier {
  id: number;
  name: string;
  payment_term_type: string;
  payment_term_days: number | null;
}

export default function InvoiceReviewModal({
  data,
  onClose,
  onSaved,
}: {
  data: AnalyzeResult;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | "">(data.matched_supplier?.id ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(data.extracted.invoice_number ?? "");
  const [invoiceDate, setInvoiceDate] = useState(data.extracted.invoice_date ?? "");
  const [amount, setAmount] = useState(String(data.extracted.total_amount ?? ""));
  const [currency, setCurrency] = useState(data.extracted.currency ?? "ILS");
  const [description, setDescription] = useState(data.extracted.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
  }, []);

  async function save(status: "pending_review" | "confirmed") {
    setSaving(true);
    // First create the invoice
    const createRes = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id: supplierId || null,
        invoice_number: invoiceNumber || null,
        invoice_date: invoiceDate || null,
        amount: amount ? Number(amount) : null,
        currency,
        description: description || null,
        image_url: data.image_url,
        status: "pending_review",
      }),
    });
    const invoice = await createRes.json();

    // If confirming immediately, PATCH to confirmed to trigger payment creation
    if (status === "confirmed" && supplierId && invoiceDate && amount) {
      await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          supplier_id: supplierId,
          invoice_number: invoiceNumber || null,
          invoice_date: invoiceDate,
          amount: Number(amount),
          currency,
          description: description || null,
          status: "confirmed",
        }),
      });
    }

    setSaving(false);
    onSaved();
  }

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Review Extracted Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Preview */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">Invoice Preview</p>
            <img src={data.image_url} alt="Invoice" className="w-full rounded-lg border border-slate-200 object-contain max-h-64" />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">
                Supplier {data.matched_supplier && (
                  <span className="text-green-600 ml-1">
                    (auto-matched: {Math.round(data.matched_supplier.score * 100)}%)
                  </span>
                )}
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {selectedSupplier && (
                <p className="text-xs text-blue-600 mt-1">
                  Terms: {selectedSupplier.payment_term_type === "shotef_plus"
                    ? `ש+${selectedSupplier.payment_term_days}`
                    : selectedSupplier.payment_term_type}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">OCR Supplier Name</label>
              <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                {data.extracted.supplier_name ?? "—"}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Invoice Number</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Invoice Date</label>
              <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-500 font-medium block mb-1">Amount</label>
                <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="w-24">
                <label className="text-xs text-slate-500 font-medium block mb-1">Currency</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="ILS">ILS ₪</option>
                  <option value="USD">USD $</option>
                  <option value="EUR">EUR €</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Description</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={() => save("confirmed")}
            disabled={saving || !supplierId || !invoiceDate || !amount}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Check size={16} /> Confirm & Schedule Payment
          </button>
          <button
            onClick={() => save("pending_review")}
            disabled={saving}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-white"
          >
            Save for Later
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 ml-auto">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

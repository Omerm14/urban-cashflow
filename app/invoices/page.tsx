"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Eye, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoiceReviewModal from "@/components/InvoiceReviewModal";

interface Invoice {
  id: number;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: number | null;
  currency: string;
  status: "pending_review" | "confirmed" | "processed";
  image_url: string | null;
  created_at: string;
}

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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_review: { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-700" },
  processed: { label: "Processed", className: "bg-green-100 text-green-700" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewData, setReviewData] = useState<AnalyzeResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/invoices");
    setInvoices(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await fetch("/api/invoices/analyze", { method: "POST", body: fd });
      const data: AnalyzeResult = await res.json();
      setReviewData(data);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deleteInvoice(id: number) {
    if (!confirm("Delete this invoice?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer">
          <Upload size={16} />
          {uploading ? "Analyzing…" : "Upload Invoice"}
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
            onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        {uploading ? (
          <p className="text-blue-600 font-medium">Analyzing invoice with Claude Vision…</p>
        ) : (
          <>
            <Upload className="mx-auto text-slate-400 mb-3" size={32} />
            <p className="text-slate-500 text-sm">Drag & drop an invoice image here, or use the button above</p>
            <p className="text-slate-400 text-xs mt-1">Supports JPG, PNG, PDF</p>
          </>
        )}
      </div>

      {/* Invoice table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Supplier</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Invoice Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No invoices yet.</td></tr>
            ) : invoices.map((inv) => {
              const badge = STATUS_LABELS[inv.status] ?? STATUS_LABELS.pending_review;
              return (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.supplier_name ?? <span className="text-amber-600 italic">Unknown</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.invoice_number ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.invoice_date ? formatDate(inv.invoice_date) : "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{inv.amount ? formatCurrency(Number(inv.amount), inv.currency) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    {inv.image_url && (
                      <a href={`/invoices/${inv.id}`} className="text-slate-400 hover:text-blue-600"><Eye size={15} /></a>
                    )}
                    <button onClick={() => deleteInvoice(inv.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reviewData && (
        <InvoiceReviewModal
          data={reviewData}
          onClose={() => setReviewData(null)}
          onSaved={() => { setReviewData(null); load(); }}
        />
      )}
    </div>
  );
}

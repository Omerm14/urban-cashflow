"use client";

import { useState } from "react";
import { Pencil, ExternalLink, Check, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payment {
  id: number;
  supplier_name: string;
  amount: number;
  currency: string;
  invoice_date: string | null;
  invoice_number: string | null;
  image_url: string | null;
  calculated_due_date: string;
  overridden_due_date: string | null;
  override_reason: string | null;
  status: "scheduled" | "paid";
}

export default function PaymentRow({
  payment,
  onUpdated,
}: {
  payment: Payment;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [overrideDate, setOverrideDate] = useState(payment.overridden_due_date ?? "");
  const [overrideReason, setOverrideReason] = useState(payment.override_reason ?? "");
  const [saving, setSaving] = useState(false);

  const effectiveDate = payment.overridden_due_date ?? payment.calculated_due_date;
  const isOverridden = !!payment.overridden_due_date;

  async function saveOverride() {
    setSaving(true);
    await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: payment.id,
        overridden_due_date: overrideDate || null,
        override_reason: overrideReason || null,
      }),
    });
    setSaving(false);
    setEditing(false);
    onUpdated();
  }

  async function markPaid() {
    await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: payment.id, status: payment.status === "paid" ? "scheduled" : "paid" }),
    });
    onUpdated();
  }

  return (
    <>
      <tr className={`border-t border-slate-100 hover:bg-slate-50 ${payment.status === "paid" ? "opacity-50" : ""}`}>
        <td className="px-4 py-3 font-medium text-slate-800">{payment.supplier_name}</td>
        <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(payment.amount))}</td>
        <td className="px-4 py-3 text-slate-500">{payment.invoice_date ? formatDate(payment.invoice_date) : "—"}</td>
        <td className="px-4 py-3">
          <span className={isOverridden ? "text-amber-600 font-medium" : "text-slate-700"}>
            {formatDate(effectiveDate)}
          </span>
          {isOverridden && (
            <span className="ml-1 text-xs text-amber-500" title={payment.override_reason ?? ""}>✎</span>
          )}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={markPaid}
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              payment.status === "paid"
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"
            }`}
          >
            {payment.status === "paid" ? "Paid" : "Scheduled"}
          </button>
        </td>
        <td className="px-4 py-3 flex items-center gap-2">
          {payment.image_url && (
            <a href={payment.image_url} target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700">
              <ExternalLink size={14} />
            </a>
          )}
          <button onClick={() => setEditing(!editing)} className="text-slate-400 hover:text-slate-700">
            <Pencil size={14} />
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="border-t border-amber-100 bg-amber-50">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs text-slate-600 font-medium">Override due date:</label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Reason for override"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm flex-1 min-w-40"
              />
              <button onClick={saveOverride} disabled={saving}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
                <Check size={14} /> Save
              </button>
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-1 px-3 py-1 text-sm text-slate-600 hover:text-slate-900">
                <X size={14} /> Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

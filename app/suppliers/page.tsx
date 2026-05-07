"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import { formatTermLabel } from "@/lib/payment-terms";

interface Supplier {
  id: number;
  name: string;
  aliases: string[];
  payment_term_type: "shotef_plus" | "shotef" | "immediate" | "custom";
  payment_term_days: number | null;
  notes: string | null;
}

const TERM_TYPES = [
  { value: "shotef_plus", label: "ש+X (שוטף + ימים)" },
  { value: "shotef", label: "שוטף (סוף חודש)" },
  { value: "immediate", label: "מזומן / מיידי" },
  { value: "custom", label: "מותאם אישית" },
];

const EMPTY: Partial<Supplier> = {
  name: "",
  aliases: [],
  payment_term_type: "shotef_plus",
  payment_term_days: 30,
  notes: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<Partial<Supplier>>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/suppliers");
    setSuppliers(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function save() {
    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { ...form, id: editingId } : form;
    await fetch("/api/suppliers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        aliases: typeof body.aliases === "string"
          ? (body.aliases as string).split(";").map((a) => a.trim()).filter(Boolean)
          : body.aliases ?? [],
      }),
    });
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this supplier?")) return;
    await fetch("/api/suppliers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function startEdit(s: Supplier) {
    setForm(s);
    setEditingId(s.id);
    setShowForm(true);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/suppliers/import", { method: "POST", body: fd });
    const data = await res.json();
    alert(`Imported ${data.inserted} suppliers.`);
    setImporting(false);
    load();
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    const csv = "name,aliases,payment_term_type,payment_term_days,notes\nExample Supplier,Alias1;Alias2,shotef_plus,30,\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "suppliers-template.csv";
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
        <div className="flex gap-3">
          <button onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            <Download size={15} /> Template
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
            <Upload size={15} /> {importing ? "Importing…" : "Import CSV/Excel"}
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={() => { setForm(EMPTY); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card border-blue-200 bg-blue-50">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            {editingId ? "Edit Supplier" : "New Supplier"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Name *</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Aliases (semicolon-separated)</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={Array.isArray(form.aliases) ? form.aliases.join("; ") : (form.aliases ?? "")}
                onChange={(e) => setForm({ ...form, aliases: e.target.value.split(";").map((a) => a.trim()) })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Payment Term Type</label>
              <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.payment_term_type ?? "shotef_plus"}
                onChange={(e) => setForm({ ...form, payment_term_type: e.target.value as Supplier["payment_term_type"] })}>
                {TERM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {form.payment_term_type === "shotef_plus" && (
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Days after end-of-month</label>
                <input type="number" min={0} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={form.payment_term_days ?? ""} onChange={(e) => setForm({ ...form, payment_term_days: Number(e.target.value) })} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 font-medium block mb-1">Notes</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              {editingId ? "Save Changes" : "Add Supplier"}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY); setEditingId(null); }}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Aliases</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Payment Terms</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No suppliers yet. Add one above.</td></tr>
            ) : suppliers.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{(s.aliases ?? []).join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {formatTermLabel({ type: s.payment_term_type, days: s.payment_term_days ?? undefined })}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{s.notes || "—"}</td>
                <td className="px-4 py-3 flex gap-2 justify-end">
                  <button onClick={() => startEdit(s)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                  <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, paymentMonthLabel } from "@/lib/utils";
import CashflowChart from "@/components/CashflowChart";
import ExportButton from "@/components/ExportButton";
import PaymentRow from "@/components/PaymentRow";

interface Payment {
  id: number;
  supplier_name: string;
  amount: number;
  currency: string;
  invoice_date: string | null;
  invoice_number: string | null;
  image_url: string | null;
  payment_month: string;
  calculated_due_date: string;
  overridden_due_date: string | null;
  override_reason: string | null;
  status: "scheduled" | "paid";
}

interface Invoice {
  id: number;
  supplier_name: string | null;
  amount: number | null;
  status: string;
  created_at: string;
  image_url: string | null;
}

export default function DashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [paymentsRes, invoicesRes] = await Promise.all([
      fetch("/api/payments"),
      fetch("/api/invoices"),
    ]);
    setPayments(await paymentsRes.json());
    setInvoices(await invoicesRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const pendingReview = invoices.filter((i) => i.status === "pending_review");

  // Group payments by month
  const byMonth = new Map<string, Payment[]>();
  for (const p of payments) {
    if (!byMonth.has(p.payment_month)) byMonth.set(p.payment_month, []);
    byMonth.get(p.payment_month)!.push(p);
  }
  const sortedMonths = [...byMonth.keys()].sort();

  // Chart data: next 6 months
  const now = new Date();
  const chartMonths: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    chartMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const chartData = chartMonths.map((m) => ({
    month: paymentMonthLabel(m),
    total: (byMonth.get(m) ?? []).filter((p) => p.status === "scheduled").reduce((s, p) => s + Number(p.amount), 0),
  }));

  const totalScheduled = payments
    .filter((p) => p.status === "scheduled")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <ExportButton />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total Scheduled Payments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalScheduled)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Pending Review</p>
          <p className={`text-2xl font-bold mt-1 ${pendingReview.length > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {pendingReview.length} invoices
          </p>
          {pendingReview.length > 0 && (
            <a href="/invoices" className="text-xs text-blue-600 underline mt-1 block">Review now →</a>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Upcoming (this month)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(
              (byMonth.get(chartMonths[0]) ?? [])
                .filter((p) => p.status === "scheduled")
                .reduce((s, p) => s + Number(p.amount), 0)
            )}
          </p>
        </div>
      </div>

      {/* Cashflow chart */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-700 mb-4">6-Month Payment Forecast</h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400">Loading…</div>
        ) : (
          <CashflowChart data={chartData} />
        )}
      </div>

      {/* Payments by month */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Payments by Month</h2>
        {loading ? (
          <div className="text-slate-400">Loading…</div>
        ) : sortedMonths.length === 0 ? (
          <p className="text-slate-400 text-sm">No payments yet. Confirm invoices to see them here.</p>
        ) : (
          <div className="space-y-4">
            {sortedMonths.map((month) => {
              const rows = byMonth.get(month)!;
              const total = rows.reduce((s, p) => s + Number(p.amount), 0);
              return (
                <details key={month} className="border border-slate-200 rounded-lg" open={month === chartMonths[0]}>
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-800">{paymentMonthLabel(month)}</span>
                    <span className="text-blue-700 font-semibold">{formatCurrency(total)}</span>
                  </summary>
                  <div className="border-t border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">Supplier</th>
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">Amount</th>
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">Invoice Date</th>
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">Due Date</th>
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">Status</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((p) => (
                          <PaymentRow key={p.id} payment={p} onUpdated={load} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

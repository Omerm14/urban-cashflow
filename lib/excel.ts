import * as XLSX from "xlsx";
import { formatDate } from "./utils";

export interface PaymentRow {
  supplier_name: string;
  amount: number;
  currency: string;
  invoice_date: string | null;
  invoice_number: string | null;
  image_url: string | null;
  payment_month: string;
  overridden_due_date: string | null;
  override_reason: string | null;
}

export function buildPaymentsWorkbook(payments: PaymentRow[]): Buffer {
  const wb = XLSX.utils.book_new();

  // Group by payment_month
  const byMonth = new Map<string, PaymentRow[]>();
  for (const p of payments) {
    if (!byMonth.has(p.payment_month)) byMonth.set(p.payment_month, []);
    byMonth.get(p.payment_month)!.push(p);
  }

  const sortedMonths = [...byMonth.keys()].sort();
  const summaryRows: [string, number][] = [];

  for (const month of sortedMonths) {
    const rows = byMonth.get(month)!;
    const total = rows.reduce((s, r) => s + r.amount, 0);
    summaryRows.push([month, total]);

    const sheetData = [
      ["ספק", "סכום (₪)", "תאריך חשבונית", "מספר חשבונית", "קישור לחשבונית", "הערת אישור"],
      ...rows.map((r) => [
        r.supplier_name,
        r.amount,
        r.invoice_date ? formatDate(r.invoice_date) : "",
        r.invoice_number ?? "",
        r.image_url ?? "",
        r.override_reason ?? "",
      ]),
      [],
      ["סה״כ", total],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [
      { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 40 }, { wch: 30 },
    ];

    // Hyperlinks for image URLs
    rows.forEach((r, i) => {
      if (r.image_url) {
        const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 4 });
        ws[cellRef] = { v: r.image_url, l: { Target: r.image_url } };
      }
    });

    XLSX.utils.book_append_sheet(wb, ws, month);
  }

  // Summary sheet
  const summaryData = [
    ["חודש תשלום", "סה״כ לתשלום (₪)"],
    ...summaryRows,
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "סיכום");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

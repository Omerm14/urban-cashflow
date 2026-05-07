import { endOfMonth, addDays, format } from "date-fns";

export type PaymentTermType = "shotef_plus" | "shotef" | "immediate" | "custom";

export interface PaymentTerm {
  type: PaymentTermType;
  days?: number;
}

export function calculateDueDate(invoiceDate: Date, term: PaymentTerm): Date {
  switch (term.type) {
    case "shotef_plus": {
      const eom = endOfMonth(invoiceDate);
      return addDays(eom, term.days ?? 0);
    }
    case "shotef":
      return endOfMonth(invoiceDate);
    case "immediate":
      return invoiceDate;
    case "custom":
      // Custom terms require manual override; fall back to end-of-month
      return endOfMonth(invoiceDate);
  }
}

export function getPaymentMonth(dueDate: Date): string {
  return format(dueDate, "yyyy-MM");
}

export function formatTermLabel(term: PaymentTerm): string {
  switch (term.type) {
    case "shotef_plus":
      return `ש+${term.days ?? 0}`;
    case "shotef":
      return "שוטף";
    case "immediate":
      return "מזומן";
    case "custom":
      return "מותאם אישית";
  }
}

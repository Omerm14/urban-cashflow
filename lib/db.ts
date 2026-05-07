import { sql } from "@vercel/postgres";

export { sql };

// ---- Types mirroring the DB schema ----

export interface Supplier {
  id: number;
  name: string;
  aliases: string[];
  payment_term_type: "shotef_plus" | "shotef" | "immediate" | "custom";
  payment_term_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  supplier_id: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: number | null;
  currency: string;
  description: string | null;
  image_url: string | null;
  drive_file_id: string | null;
  raw_ocr_json: object | null;
  status: "pending_review" | "confirmed" | "processed";
  created_at: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  supplier_id: number;
  calculated_due_date: string;
  overridden_due_date: string | null;
  override_reason: string | null;
  payment_month: string;
  amount: number;
  status: "scheduled" | "paid";
  created_at: string;
  updated_at: string;
}

// ---- Schema initialisation ----

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      aliases TEXT[] DEFAULT '{}',
      payment_term_type TEXT NOT NULL DEFAULT 'shotef_plus',
      payment_term_days INTEGER,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      invoice_number TEXT,
      invoice_date DATE,
      amount NUMERIC(12,2),
      currency TEXT NOT NULL DEFAULT 'ILS',
      description TEXT,
      image_url TEXT,
      drive_file_id TEXT UNIQUE,
      raw_ocr_json JSONB,
      status TEXT NOT NULL DEFAULT 'pending_review',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS invoices_dedup_idx
      ON invoices (supplier_id, invoice_number, invoice_date)
      WHERE supplier_id IS NOT NULL AND invoice_number IS NOT NULL AND invoice_date IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE CASCADE,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      calculated_due_date DATE NOT NULL,
      overridden_due_date DATE,
      override_reason TEXT,
      payment_month TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

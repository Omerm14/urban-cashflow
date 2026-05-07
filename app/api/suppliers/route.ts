import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function aliasesLiteral(aliases: string[]): string {
  return `{${aliases.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(",")}}`;
}

export async function GET() {
  const { rows } = await sql`
    SELECT * FROM suppliers ORDER BY name ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, aliases = [], payment_term_type, payment_term_days, notes } = body;
  const al = aliasesLiteral(aliases);

  const { rows } = await sql`
    INSERT INTO suppliers (name, aliases, payment_term_type, payment_term_days, notes)
    VALUES (${name}, ${al}::text[], ${payment_term_type}, ${payment_term_days ?? null}, ${notes ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, aliases, payment_term_type, payment_term_days, notes } = body;
  const al = aliasesLiteral(aliases ?? []);

  const { rows } = await sql`
    UPDATE suppliers
    SET name = ${name},
        aliases = ${al}::text[],
        payment_term_type = ${payment_term_type},
        payment_term_days = ${payment_term_days ?? null},
        notes = ${notes ?? null},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await sql`DELETE FROM suppliers WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

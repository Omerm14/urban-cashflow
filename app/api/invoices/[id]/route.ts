import { NextRequest, NextResponse } from "next/server";
import { deleteInvoice } from "@/lib/store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteInvoice(id);
  return NextResponse.json({ ok: true });
}

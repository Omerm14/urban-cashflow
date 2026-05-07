import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { listFolderFiles, downloadFileAsBuffer } from "@/lib/drive";
import { extractInvoiceFromUrl } from "@/lib/claude";
import { sql } from "@/lib/db";
import { matchSupplier } from "@/lib/supplier-match";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) return NextResponse.json({ error: "GOOGLE_DRIVE_FOLDER_ID not set" }, { status: 500 });

  const files = await listFolderFiles(folderId);
  if (files.length === 0) return NextResponse.json({ synced: 0, skipped: 0 });

  // Find already-processed drive file IDs using individual queries to avoid array param issues
  const existingIds = new Set<string>();
  for (const file of files) {
    const { rows } = await sql`
      SELECT 1 FROM invoices WHERE drive_file_id = ${file.id} LIMIT 1
    `;
    if (rows.length > 0) existingIds.add(file.id);
  }

  const newFiles = files.filter((f) => !existingIds.has(f.id));
  const { rows: suppliers } = await sql`SELECT id, name, aliases FROM suppliers`;

  let processed = 0;
  for (const file of newFiles) {
    try {
      const buffer = await downloadFileAsBuffer(file.id);
      // Copy into a plain ArrayBuffer to satisfy Blob's type constraint
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const fileBlob = new Blob([ab], { type: file.mimeType });
      const blob = await put(`invoices/drive-${file.id}-${file.name}`, fileBlob, { access: "public" });

      const extracted = await extractInvoiceFromUrl(blob.url);
      const match = extracted.supplier_name
        ? matchSupplier(extracted.supplier_name, suppliers.map((s) => ({
            id: s.id,
            name: s.name,
            aliases: s.aliases ?? [],
          })))
        : null;

      await sql`
        INSERT INTO invoices
          (supplier_id, invoice_number, invoice_date, amount, currency, description,
           image_url, drive_file_id, raw_ocr_json, status)
        VALUES
          (${match?.supplier.id ?? null},
           ${extracted.invoice_number ?? null},
           ${extracted.invoice_date ?? null},
           ${extracted.total_amount ?? null},
           ${extracted.currency ?? "ILS"},
           ${extracted.description ?? null},
           ${blob.url}, ${file.id},
           ${JSON.stringify(extracted)},
           'pending_review')
        ON CONFLICT (drive_file_id) DO NOTHING
      `;
      processed++;
    } catch (err) {
      console.error(`Failed to process Drive file ${file.id}:`, err);
    }
  }

  return NextResponse.json({ synced: processed, skipped: existingIds.size });
}

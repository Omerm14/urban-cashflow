import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedInvoice {
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  currency: string;
  description: string | null;
  line_items: Array<{ description: string; amount: number }>;
}

const SYSTEM_PROMPT = `You are an expert at extracting structured data from Hebrew business invoices.
Extract the following fields and return ONLY a valid JSON object with no markdown:
- supplier_name: the name of the supplier/vendor (in Hebrew or English as written)
- invoice_number: the invoice number or reference
- invoice_date: the invoice date in ISO format YYYY-MM-DD
- total_amount: the total amount as a number (no currency symbols)
- currency: "ILS" for Israeli Shekel (₪), "USD" for US Dollar, etc.
- description: brief description of goods/services
- line_items: array of {description, amount} for each line item

If a field is not found, use null. For currency, default to "ILS" if not specified.`;

const FALLBACK: ExtractedInvoice = {
  supplier_name: null,
  invoice_number: null,
  invoice_date: null,
  total_amount: null,
  currency: "ILS",
  description: null,
  line_items: [],
};

export async function extractInvoiceFromBase64(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<ExtractedInvoice> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Extract the invoice data from this image." },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    return JSON.parse(text) as ExtractedInvoice;
  } catch {
    return FALLBACK;
  }
}

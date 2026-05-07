export interface SupplierRecord {
  id: string;
  name: string;
  aliases: string[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"״׳\-_.,()/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length, 1);
}

export function matchSupplier(
  ocrName: string,
  suppliers: SupplierRecord[]
): { supplier: SupplierRecord; score: number } | null {
  const query = normalize(ocrName);
  let best: { supplier: SupplierRecord; score: number } | null = null;

  for (const supplier of suppliers) {
    const candidates = [supplier.name, ...supplier.aliases].map(normalize);
    for (const candidate of candidates) {
      if (candidate === query) return { supplier, score: 1 };
      const score = similarity(query, candidate);
      if (!best || score > best.score) {
        best = { supplier, score };
      }
    }
  }

  return best && best.score >= 0.75 ? best : null;
}

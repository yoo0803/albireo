// [[개념어]] / [[개념어|표시명]]
export const WIKILINK_RE = /\[\[([^\]|\n]{1,80})(?:\|([^\]\n]{1,80}))?\]\]/g;

function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

// 본문 내 개념어 목록 (중복 제거, 대소문자 무시)
export function extractTerms(md: string): string[] {
  const out = new Map<string, string>();
  for (const m of md.matchAll(WIKILINK_RE)) {
    const t = normalizeTerm(m[1]);
    if (t) out.set(t.toLowerCase(), t);
  }
  return [...out.values()];
}

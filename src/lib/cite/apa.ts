// CSL-JSON → APA 7th 참고문헌

export type Csl = {
  type?: string;
  title?: string | string[];
  author?: { family?: string; given?: string; literal?: string }[];
  editor?: { family?: string; given?: string; literal?: string }[];
  issued?: { "date-parts"?: (number | string)[][] };
  "container-title"?: string | string[];
  volume?: string | number;
  issue?: string | number;
  page?: string;
  publisher?: string;
  DOI?: string;
  URL?: string;
};

export type Part = { t: string; i?: boolean };
export type Reference = { doi: string; url: string; title: string; key: string; parts: Part[] };

const DOI_RE = /^10\.\d{4,9}\/\S+$/;

// DOI 정규화: URL · doi: 접두 허용
export function normalizeDoi(raw: string): string | null {
  const v = decodeURIComponent(raw.trim())
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .replace(/[.,;]+$/, "");
  return DOI_RE.test(v) ? v : null;
}

export const doiUrl = (doi: string) => `https://doi.org/${doi}`;

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? "";
const clean = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// 이름 → "Family, G. N."
function person(p: { family?: string; given?: string; literal?: string }): string {
  if (p.literal) return p.literal;
  const initials = (p.given ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((g) => g.split("-").map((x) => `${x[0]?.toUpperCase()}.`).join("-"))
    .join(" ");
  return [p.family, initials].filter(Boolean).join(", ");
}

// 저자 목록 (APA 7: 20인까지, 21인 이상 19 … 마지막)
export function authors(list: Csl["author"] = []): string {
  const n = list.map(person).filter(Boolean);
  if (n.length === 0) return "";
  if (n.length === 1) return n[0];
  if (n.length <= 20) return `${n.slice(0, -1).join(", ")}, & ${n[n.length - 1]}`;
  return `${n.slice(0, 19).join(", ")}, . . . ${n[n.length - 1]}`;
}

const year = (c: Csl) => String(c.issued?.["date-parts"]?.[0]?.[0] ?? "") || "n.d.";
const end = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);

export function formatApa(c: Csl, doi: string): Reference {
  const title = clean(first(c.title)) || doi;
  const container = clean(first(c["container-title"]));
  const who = authors(c.author?.length ? c.author : c.editor);
  const url = doiUrl(doi);
  const parts: Part[] = [];

  const lead = who ? `${end(who)} ` : "";
  const isBook = c.type === "book" || c.type === "monograph";

  if (lead) parts.push({ t: `${lead}(${year(c)}). ` });
  if (isBook) parts.push({ t: end(title), i: true });
  else parts.push({ t: end(title) });
  if (!lead) parts.push({ t: ` (${year(c)}).` });

  if (container && !isBook) {
    parts.push({ t: " " }, { t: container, i: true });
    if (c.volume) parts.push({ t: ", " }, { t: String(c.volume), i: true });
    if (c.issue) parts.push({ t: `(${c.issue})` });
    if (c.page) parts.push({ t: `, ${String(c.page).replace(/-/g, "–")}` });
    parts.push({ t: "." });
  } else if (isBook && c.publisher) {
    parts.push({ t: ` ${end(clean(c.publisher))}` });
  }
  parts.push({ t: " " });

  const key = `${(c.author?.[0]?.family ?? c.author?.[0]?.literal ?? title).toLowerCase()} ${year(c)}`;
  return { doi, url, title, key, parts };
}

// 본문 → DOI 목록 (등장 순, 중복 제거)
export function extractDois(md: string): string[] {
  const out = new Set<string>();
  for (const m of md.matchAll(/https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/[^\s)\]]+)/gi)) {
    const d = normalizeDoi(m[1]);
    if (d) out.add(d);
  }
  return [...out];
}

export const sortReferences = (refs: Reference[]) => [...refs].sort((a, b) => a.key.localeCompare(b.key, "en"));

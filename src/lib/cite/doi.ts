import "server-only";
import { formatApa, normalizeDoi, type Csl, type Reference } from "./apa";

// doi.org 콘텐츠 협상 (Crossref · DataCite 공통 CSL-JSON)
export async function fetchCsl(doi: string): Promise<Csl | null> {
  const d = normalizeDoi(doi);
  if (!d) return null;
  try {
    const r = await fetch(`https://doi.org/${encodeURIComponent(d).replace(/%2F/g, "/")}`, {
      headers: { Accept: "application/vnd.citationstyles.csl+json" },
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const text = await r.text();
    if (text.length > 500_000) return null;
    return JSON.parse(text) as Csl;
  } catch {
    return null;
  }
}

export async function lookupReference(doi: string): Promise<Reference | null> {
  const d = normalizeDoi(doi);
  if (!d) return null;
  const csl = await fetchCsl(d);
  return csl ? formatApa(csl, d) : null;
}

export async function lookupReferences(dois: string[]): Promise<Reference[]> {
  const out = await Promise.all(dois.slice(0, 60).map(lookupReference));
  return out.filter((r): r is Reference => !!r);
}

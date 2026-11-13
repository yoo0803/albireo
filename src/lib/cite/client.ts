"use client";
import { useEffect, useState } from "react";
import { extractDois, sortReferences, type Reference } from "./apa";

// DOI 조회 (작업실 전용 API, 세션 캐시)
const cache = new Map<string, Promise<Reference | null>>();

export function fetchReference(doi: string): Promise<Reference | null> {
  let p = cache.get(doi);
  if (!p) {
    p = fetch(`/api/doi?id=${encodeURIComponent(doi)}`)
      .then(async (r) => (r.ok ? ((await r.json()) as Reference) : null))
      .catch(() => null);
    cache.set(doi, p);
  }
  return p;
}

// 본문 DOI → 정렬된 참고문헌
export function useReferences(md: string): Reference[] {
  const key = extractDois(md).join("|");
  const [refs, setRefs] = useState<Reference[]>([]);
  useEffect(() => {
    let live = true;
    const dois = key ? key.split("|") : [];
    Promise.all(dois.map(fetchReference)).then((xs) => {
      if (live) setRefs(sortReferences(xs.filter((x): x is Reference => !!x)));
    });
    return () => { live = false; };
  }, [key]);
  return refs;
}

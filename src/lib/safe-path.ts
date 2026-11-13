// 내부 경로만 허용 (오픈 리다이렉트 차단)
export function safePath(next: string | null | undefined, fallback = "/studio"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

// 방문 기록 정리 (순수 함수 · 테스트용)
export const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora|whatsapp|telegram|discord|headless|lighthouse|pingdom|uptime/i;

export function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

// 유입 경로: 외부 호스트만 (www. 제거)
export function refHost(ref: string, self: string): string | null {
  try {
    const u = new URL(ref);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.replace(/^www\./, "").toLowerCase();
    const me = new URL(self).hostname.replace(/^www\./, "").toLowerCase();
    if (!h || h === me || h === "localhost") return null;
    return h.slice(0, 120);
  } catch {
    return null;
  }
}

// 경로: 쿼리 · 해시 제거, 길이 제한
export function cleanPath(p: unknown): string | null {
  if (typeof p !== "string" || !p.startsWith("/") || p.startsWith("//")) return null;
  const s = p.split(/[?#]/)[0].slice(0, 300);
  return /^[\w\-./%~@:+]*$/.test(s) ? s : null;
}

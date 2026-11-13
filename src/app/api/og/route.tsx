import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const COLOR: Record<string, string> = { cs: "#6a95dd", chem: "#93aa8c", media: "#c97a63", policy: "#d9a441" };
const LABEL: Record<string, string> = { cs: "COMPUTING", chem: "CHEMISTRY", media: "MEDIA", policy: "POLICY" };

// 필요한 글자만 서브셋 로드 (Google Fonts text=)
async function loadFont(family: string, weight: number, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
    { headers: { "User-Agent": "Mozilla/5.0 (compatible; OG)" } },
  ).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  if (!url) throw new Error("font url");
  return fetch(url).then((r) => r.arrayBuffer());
}

// 결정적 ASCII 별밭
function starfield(seed: string, cols = 64, rows = 14) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 13), 1274126177)) >>> 0) / 4294967296;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => { const r = rnd(); return r > 0.985 ? "✦" : r > 0.95 ? "·" : r > 0.93 ? "." : " "; }).join(""),
  ).join("\n");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const title = (q.get("title") ?? "Albireo").slice(0, 90);
  const kicker = (q.get("kicker") ?? "").slice(0, 80);
  const author = (q.get("author") ?? "").slice(0, 40);
  const d = q.get("d") ?? "";
  const accent = COLOR[d] ?? "#d9a441";
  const glyphs = `${title}${kicker}${author}ALBIREO PEER-REVIEWED WEBZINE·${LABEL[d] ?? ""}`;

  const [serif, mono] = await Promise.all([
    loadFont("Noto+Serif+KR", 700, glyphs).catch(() => null),
    loadFont("JetBrains+Mono", 400, `${glyphs}0123456789·.✦ `).catch(() => null),
  ]);

  const fonts = [
    ...(serif ? [{ name: "Serif", data: serif, weight: 700 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Mono", data: mono, weight: 400 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#060709", color: "#ebe5d6", position: "relative", fontFamily: "Serif" }}>
        {/* 유화풍 광원 */}
        <div style={{ position: "absolute", right: -120, top: -160, width: 640, height: 640, borderRadius: 640, background: "radial-gradient(circle, rgba(217,164,65,.45), rgba(217,164,65,0) 70%)" }} />
        <div style={{ position: "absolute", right: 120, top: 140, width: 300, height: 300, borderRadius: 300, background: "radial-gradient(circle, rgba(106,149,221,.45), rgba(106,149,221,0) 70%)" }} />
        <pre style={{ position: "absolute", left: 0, top: 0, margin: 0, padding: 24, fontFamily: "Mono", fontSize: 22, lineHeight: 1.6, color: "rgba(235,229,214,.18)", whiteSpace: "pre" }}>{starfield(title)}</pre>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "Mono", fontSize: 22, letterSpacing: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, background: "#d9a441" }} />
          <div style={{ width: 9, height: 9, borderRadius: 9, background: "#6a95dd" }} />
          <span>ALBIREO</span>
          {LABEL[d] && <span style={{ color: accent }}>· {LABEL[d]}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
          <div style={{ fontSize: title.length > 28 ? 64 : 84, lineHeight: 1.15, letterSpacing: -2 }}>{title}</div>
          {kicker && <div style={{ fontSize: 32, color: "#aaa496" }}>{kicker}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Mono", fontSize: 20, color: "#aaa496", letterSpacing: 2, borderTop: "1px solid rgba(235,229,214,.2)", paddingTop: 20 }}>
          <span>{author || "PEER-REVIEWED WEBZINE"}</span>
          <span style={{ color: accent }}>✦</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" } },
  );
}

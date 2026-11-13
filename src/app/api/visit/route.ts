import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv, env } from "@/lib/env";
import { BOT, cleanPath, deviceOf, refHost } from "@/lib/visit";

const UUID = /^[0-9a-f-]{36}$/;

// 방문 기록 수집 (익명 · 일 단위 해시)
export async function POST(req: Request) {
  const db = supabaseAdmin();
  const ua = req.headers.get("user-agent") ?? "";
  if (!db || !ua || BOT.test(ua)) return new Response(null, { status: 204 });
  let b: { p?: unknown; r?: unknown; v?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > 2000) return new Response(null, { status: 413 });
    b = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const path = cleanPath(b.p);
  const v = typeof b.v === "string" && UUID.test(b.v) ? b.v : null;
  if (!path || !v) return new Response(null, { status: 400 });

  // 시드니 날짜 기준 하루 고유 방문자
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
  const visitor = createHash("sha256").update(`${v}|${day}|${serverEnv().serviceKey.slice(-16)}`).digest("hex");
  const country = (req.headers.get("x-vercel-ip-country") ?? "").slice(0, 2).toUpperCase() || null;

  await db.from("site_visits").insert({
    path,
    ref_host: typeof b.r === "string" ? refHost(b.r, env.siteUrl) : null,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    device: deviceOf(ua),
    visitor,
    day,
  });
  return new Response(null, { status: 204 });
}

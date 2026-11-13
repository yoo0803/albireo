import { supabasePublic } from "@/lib/supabase/server";

// Supabase 무료 플랜 7일 미사용 정지 방지: Vercel Cron 이 하루 한 번 호출
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // CRON_SECRET 설정 시 Vercel Cron 요청만 허용
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // 공개 글 1건 조회 (읽기 전용 · 가장 가벼운 요청)
  const { error } = await supabasePublic().from("articles").select("id").limit(1);
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}

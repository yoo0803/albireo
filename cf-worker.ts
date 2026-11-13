// Cloudflare 진입점: OpenNext 워커 + 매일 Supabase 깨우기 예약
// @ts-expect-error 빌드 뒤에 생기는 파일 (opennextjs-cloudflare build)
import handler from "./.open-next/worker.js";

type Env = { NEXT_PUBLIC_SUPABASE_URL?: string; NEXT_PUBLIC_SUPABASE_ANON_KEY?: string };
type Ctx = { waitUntil(p: Promise<unknown>): void };

export default {
  fetch: handler.fetch,

  // 공개 글 1건 조회 (읽기 전용 · 가장 가벼운 요청)
  async scheduled(_event: unknown, env: Env, ctx: Ctx) {
    const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    ctx.waitUntil(fetch(`${url.replace(/\/$/, "")}/rest/v1/articles?select=id&limit=1`, { headers: { apikey: key, authorization: `Bearer ${key}` } }));
  },
};

// OpenNext 내부 객체 (워커가 내보내는 것 그대로)
// @ts-expect-error 빌드 뒤에 생기는 파일
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

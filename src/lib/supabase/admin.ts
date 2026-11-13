import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env, serverEnv } from "@/lib/env";

// 서버 전용 관리 클라이언트 (RLS 우회). 키 없으면 null
export function supabaseAdmin() {
  const key = serverEnv().serviceKey;
  if (!env.supabaseUrl || !key) return null;
  return createClient<Database>(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

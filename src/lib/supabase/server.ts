import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

// 요청 단위 클라이언트 (RLS 적용)
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // RSC 렌더 중 쓰기 불가: 미들웨어가 갱신
        }
      },
    },
  });
}

// 쿠키 없는 익명 클라이언트 (공개 페이지 · ISR)
export function supabasePublic() {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 현재 사용자 + 멤버 여부
export async function getViewer() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, profile: null } as const;
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
  return { sb, user, profile } as const;
}

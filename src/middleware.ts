import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 정적 자원 · OG · 모니터링 터널 제외
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/og|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};

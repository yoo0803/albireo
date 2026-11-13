import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { safePath } from "@/lib/safe-path";

const TYPES: EmailOtpType[] = ["magiclink", "email", "recovery", "invite", "signup", "email_change"];

// 로그인 링크 처리: token_hash (어느 기기에서나) · PKCE code (같은 브라우저) · 실패 사유 전달
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const next = safePath(searchParams.get("next"));
  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?error=${reason}&next=${encodeURIComponent(next)}`);

  // Supabase가 보낸 오류 (만료 · 이미 사용)
  const code_ = searchParams.get("error_code") ?? searchParams.get("error");
  if (code_) return fail(/expired|invalid|access_denied/i.test(code_) ? "expired" : "auth");

  const sb = await supabaseServer();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail(/expired|invalid/i.test(error.message) ? "expired" : "auth");
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    // 링크를 요청한 브라우저가 아니면 확인 값(code verifier)이 없음
    return fail(/verifier/i.test(error.message) ? "device" : /expired|invalid/i.test(error.message) ? "expired" : "auth");
  }
  return fail("auth");
}

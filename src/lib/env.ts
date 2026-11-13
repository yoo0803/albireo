// 환경 변수 (붙여넣기 공백 제거)
const v = (x: string | undefined) => (x ?? "").trim();

export const env = {
  supabaseUrl: v(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: v(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: (v(process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000").replace(/\/$/, ""),
  gaId: v(process.env.NEXT_PUBLIC_GA_ID),
  sentryDsn: v(process.env.NEXT_PUBLIC_SENTRY_DSN),
};

// 서버 전용: 구독 메일 · 방문 통계 (미설정 시 기능 비활성)
export const serverEnv = () => ({
  serviceKey: v(process.env.SUPABASE_SERVICE_ROLE_KEY),
  smtpHost: v(process.env.SMTP_HOST) || "smtp.gmail.com",
  smtpPort: Number(v(process.env.SMTP_PORT) || 465),
  smtpUser: v(process.env.SMTP_USER),
  smtpPass: v(process.env.SMTP_PASS).replace(/\s+/g, ""), // 앱 비밀번호 공백 제거
  mailFrom: v(process.env.MAIL_FROM),
  // 가입 신청 알림 받는 메일 (없으면 SMTP 계정)
  adminEmail: v(process.env.ADMIN_EMAIL) || v(process.env.SMTP_USER),
});

// 관리자 여부: DB 의 profiles.is_admin (멤버 본인이 바꿀 수 없음)
export const isAdmin = (profile?: { is_admin?: boolean | null; is_member?: boolean | null } | null) => !!profile?.is_member && !!profile?.is_admin;

// Supabase 미설정 시 데모 모드
export const isDemo = !env.supabaseUrl || !env.supabaseAnonKey;

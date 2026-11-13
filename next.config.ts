import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ascii-magic-art: 순수 ESM 패키지
  transpilePackages: ["ascii-magic-art"],
  // 브라우저 전용 라이브러리는 서버 번들에서 제외 (Cloudflare 워커 용량)
  webpack(config, { isServer }) {
    if (isServer) config.resolve.alias = { ...config.resolve.alias, "tesseract.js": false };
    return config;
  },
  images: {
    // next/image 미사용 · Cloudflare 이미지 변환 없이
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
        ],
      },
      // 스튜디오: 검색 제외
      { source: "/studio/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  // 서버 쪽 자동 계측 끔: Cloudflare 무료 플랜 용량 (서버 오류는 Cloudflare 로그로)
  webpack: { autoInstrumentServerFunctions: false, autoInstrumentMiddleware: false, autoInstrumentAppDirectory: false },
});

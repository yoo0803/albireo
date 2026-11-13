import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { StudioPromo } from "@/components/promo/StudioPromo";
import { Seal } from "@/components/art/Seal";
import { safePath } from "@/lib/safe-path";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const t = await getT();
  const { next, error, mode } = await searchParams;
  return (
    <section className="wrap login">
      <div className="login-split">
        <div className="login-card">
          <span className="tape" aria-hidden="true" />
          <span className="login-seal" aria-hidden="true"><Seal lines={t("작업|실", "STU|DIO").split("|")} size={72} /></span>
          <p className="label faint">{t("작업실", "Studio")}</p>
          <h1 className="display login-title">Studio <em>access</em></h1>
          <p className="dim">{t("멤버 전용", "Members only")}</p>
          <LoginForm next={safePath(next)} initial={mode === "link" || mode === "join" ? mode : error ? "link" : "password"} />
          {error && (
            <p className="error-text">
              {error === "device"
                ? t("링크를 요청한 브라우저에서 열어 주십시오. 다른 기기나 메일 앱 안 브라우저에서 열면 로그인되지 않습니다.", "Open the link in the same browser you requested it from.")
                : error === "expired"
                  ? t("링크가 만료되었거나 이미 사용되었습니다. 새 링크를 받아 주십시오.", "This link has expired or was already used. Please request a new one.")
                  : t("링크가 만료되었거나 잘못되었습니다.", "This link has expired or is invalid.")}
            </p>
          )}
        </div>
        <StudioPromo />
      </div>
    </section>
  );
}

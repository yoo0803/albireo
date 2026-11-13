"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";

// 라우트 에러 화면 (Sentry 보고)
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <section className="wrap" style={{ minHeight: "60dvh", display: "grid", placeContent: "center", gap: 16, textAlign: "center" }}>
      <p className="label faint">Error{error.digest ? ` · ${error.digest}` : ""}</p>
      <h1 className="display" style={{ fontSize: "clamp(2.4rem, 7vw, 4rem)" }}>{t("문제가 생겼어요", "Something went wrong")}</h1>
      <button className="btn" style={{ justifySelf: "center" }} onClick={reset}>{t("다시 시도", "Try again")}</button>
    </section>
  );
}

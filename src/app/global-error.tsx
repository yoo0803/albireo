"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // 브라우저 전역 오류로 보고 → Sentry 브라우저 SDK가 수집 (서버 번들에 Sentry 안 들어가게)
  useEffect(() => { reportError(error); }, [error]);
  return (
    <html lang="ko">
      <body style={{ background: "#f2ede1", color: "#1c1a16", fontFamily: "system-ui", display: "grid", placeContent: "center", minHeight: "100dvh", gap: 16, textAlign: "center" }}>
        <p style={{ fontFamily: "monospace", letterSpacing: ".1em" }}>UNEXPECTED ERROR {error.digest ? `· ${error.digest}` : ""}</p>
        <button onClick={reset} style={{ padding: "10px 18px", background: "transparent", color: "inherit", border: "1px solid #555", cursor: "pointer" }}>Retry</button>
      </body>
    </html>
  );
}

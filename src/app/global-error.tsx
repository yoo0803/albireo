"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="ko">
      <body style={{ background: "#f2ede1", color: "#1c1a16", fontFamily: "system-ui", display: "grid", placeContent: "center", minHeight: "100dvh", gap: 16, textAlign: "center" }}>
        <p style={{ fontFamily: "monospace", letterSpacing: ".1em" }}>UNEXPECTED ERROR {error.digest ? `· ${error.digest}` : ""}</p>
        <button onClick={reset} style={{ padding: "10px 18px", background: "transparent", color: "inherit", border: "1px solid #555", cursor: "pointer" }}>Retry</button>
      </body>
    </html>
  );
}

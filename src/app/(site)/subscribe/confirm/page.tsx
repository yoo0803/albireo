import type { Metadata } from "next";
import Link from "next/link";
import { confirmSubscription } from "../actions";
import { getT } from "@/lib/i18n/server";
import { AlbireoScope } from "@/components/art/AlbireoScope";
import { FontLinks } from "@/components/article/FontLinks";

export const metadata: Metadata = { title: "Subscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

// 구독 확인 (메일 링크) · 공전 그래픽
export default async function Confirm({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = await getT();
  const ok = await confirmSubscription(String((await searchParams).t ?? ""));
  return (
    <section className="section">
      <FontLinks id="song-myung" />
      <div className="wrap sub-done">
        <div className="stack" style={{ ["--gap" as string]: "18px" }}>
          <span className="label faint">Albireo: Letters</span>
          <h1 className="sub-done-title">{ok ? t("구독이 완료되었습니다", "You’re subscribed") : t("링크가 만료되었습니다", "This link has expired")}</h1>
          <p className="dim sub-done-text">
            {ok
              ? <>{t("새 글이 발행되면 메일로 알려 드리겠습니다.", "We’ll email you whenever a new piece is published.")}<br />{t("환영 편지도 함께 보내 드렸습니다.", "A welcome letter is on its way.")}</>
              : t("링크가 올바르지 않거나 이미 해지된 구독입니다. 번거로우시겠지만 다시 신청해 주십시오.", "This link is invalid or the subscription was cancelled. Please subscribe again.")}
          </p>
          <p className="sub-done-links">
            <Link href={ok ? "/articles" : "/subscribe"} className="btn">{ok ? t("웹진 보기", "Read the webzine") : t("다시 구독하기", "Subscribe again")} →</Link>
            {ok && <Link href="/about" className="label faint">{t("Albireo 이야기", "The Albireo story")} →</Link>}
          </p>
        </div>
        <div className="sub-done-art" aria-hidden={!ok || undefined}>
          <AlbireoScope />
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unsubscribe } from "../actions";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

// 구독 해지: 버튼 확인 (메일 스캐너 자동 해지 방지)
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const token = String(sp.t ?? "");
  async function run() {
    "use server";
    await unsubscribe(token);
    redirect("/subscribe/unsubscribe?done=1");
  }
  return (
    <section className="section">
      <div className="wrap stack sub-page" style={{ ["--gap" as string]: "18px" }}>
        <h1 className="display" style={{ fontSize: "clamp(2.6rem, 7vw, 5rem)" }}>{sp.done ? t("해지되었습니다", "Unsubscribed") : t("구독 해지", "Unsubscribe")}</h1>
        {sp.done ? (
          <p className="dim">{t("더 이상 메일을 보내 드리지 않습니다. 그동안 함께해 주셔서 감사합니다.", "You won’t receive any more emails. Thank you for reading.")}</p>
        ) : (
          <form action={run}>
            <p className="dim" style={{ marginBottom: 18 }}>{t("새 글 알림 메일 수신을 중단하시겠습니까?", "Stop receiving new-article emails?")}</p>
            <button className="btn btn-gold">{t("구독 해지", "Unsubscribe")}</button>
          </form>
        )}
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { SubscribeForm } from "@/components/layout/SubscribeForm";
import { Backdrop } from "@/components/art/Backdrop";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Subscribe", alternates: { canonical: "/subscribe" } };

// 구독 페이지
export default async function Subscribe() {
  const t = await getT();
  return (
    <section className="section has-backdrop">
      <Backdrop seed="albireo-commons" tone="albireo" />
      <div className="wrap stack sub-page" style={{ ["--gap" as string]: "24px" }}>
        <h1 className="sr-only">{t("구독", "Subscribe")}</h1>
        <SubscribeForm id="sub-page" />
      </div>
    </section>
  );
}

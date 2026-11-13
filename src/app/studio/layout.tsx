import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StudioNav } from "@/components/studio/StudioNav";
import { isAdmin } from "@/lib/env";
import { Workbench } from "@/components/canvas/Workbench";
import { Backdrop } from "@/components/art/Backdrop";
import { StudioBackdrop } from "@/components/art/StudioBackdrop";
import { getViewer } from "@/lib/supabase/server";
import { isDemo } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Studio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  // 데모: 로컬 캔버스 샌드박스만
  if (isDemo) {
    return (
      <>
        <SiteHeader studio />
        <main id="main" className="wrap section stack has-backdrop" style={{ ["--gap" as string]: "24px" }}>
          <Backdrop seed="albireo-commons" tone="albireo" />
          <p className="label faint">Demo</p>
          <h1 className="studio-title">Canvas sandbox</h1>
          <p className="studio-note">{t("로그인 없는 체험용 캔버스", "Try-out canvas, no sign-in")}</p>
          <Workbench canvasId={null} initialTitle="Sandbox" initialDoc={null} />
        </main>
      </>
    );
  }

  const { user, profile } = await getViewer();
  if (!user) redirect("/login?next=/studio");

  return (
    <>
      <SiteHeader studio />
      {profile?.is_member ? (
        <div className="studio">
          <StudioBackdrop handle={profile.handle} tone={profile.discipline} />
          <StudioNav name={profile.display_name} admin={isAdmin(profile)} />
          <main id="main" className="studio-main">{children}</main>
        </div>
      ) : (
        <main id="main" className="wrap section">
          <h1 className="studio-title">{t("승인 대기", "Awaiting approval")}</h1>
          <p className="dim">{t(`계정(${user.email})이 아직 멤버로 등록되지 않았습니다. 로그인 화면의 ‘멤버 가입 신청’으로 신청하시면 관리자 승인 후 이용하실 수 있습니다.`, `${user.email} is not a member yet. Use ‘Request membership’ on the sign-in page; access opens once the admin approves.`)}</p>
        </main>
      )}
    </>
  );
}

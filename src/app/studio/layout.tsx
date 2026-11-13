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
import { cancelLogin, requestLogin, signOut } from "./actions";
import { SubmitButton } from "@/components/studio/SubmitButton";

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

  const { sb, user, profile } = await getViewer();
  if (!user) redirect("/login?next=/studio");
  // 비멤버: 기존 프로필 연결 요청 상태
  const [{ data: req }, { data: members }] = profile?.is_member
    ? [{ data: null }, { data: null }]
    : await Promise.all([
        sb.from("profile_logins").select("profile_id, status").eq("user_id", user.id).maybeSingle(),
        sb.from("profiles").select("id, display_name, handle").eq("is_member", true).order("display_name"),
      ]);
  const reqName = members?.find((m) => m.id === req?.profile_id)?.display_name;

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

          <section className="panel" style={{ marginTop: 28, maxWidth: 560 }}>
            <div className="panel-head"><span className="mono">{t("기존 프로필에 계정 연결", "Link to an existing profile")}</span></div>
            <p className="panel-note">{t("이미 멤버인 분이 다른 메일로 로그인했다면, 그 프로필에 이 계정을 연결해 달라고 요청하세요. 프로필 쪽에서 설정 화면에서 승인하면 바로 쓸 수 있습니다.", "Already a member under another email? Ask to link this account to that profile. Once it’s approved in that profile’s settings, you’re in.")}</p>
            {req?.status === "pending" ? (
              <form action={cancelLogin} className="panel-body stack">
                <p>{t(`${reqName ?? "선택한 프로필"} 쪽 승인을 기다리는 중입니다.`, `Waiting for ${reqName ?? "the profile"} to approve.`)}</p>
                <SubmitButton pending="…" className="btn btn-start">{t("요청 취소", "Cancel request")}</SubmitButton>
              </form>
            ) : (
              <form action={requestLogin} className="panel-body stack">
                {req?.status === "declined" && <p className="error-text">{t("이전 요청이 거절되었습니다.", "Your last request was declined.")}</p>}
                <div className="field">
                  <label htmlFor="lp">{t("프로필", "Profile")}</label>
                  <select id="lp" name="profile" className="select" required defaultValue="">
                    <option value="" disabled>—</option>
                    {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.display_name} ({m.handle})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="ln">{t("메모 (선택)", "Note (optional)")}</label>
                  <input id="ln" name="note" className="input" maxLength={200} placeholder={t("예: 학교 메일 계정입니다", "e.g. my school email")} />
                </div>
                <SubmitButton pending="…" className="btn btn-gold btn-start">{t("연결 요청", "Request link")}</SubmitButton>
              </form>
            )}
          </section>
          <form action={signOut} style={{ marginTop: 20 }}>
            <SubmitButton pending="…" className="btn btn-sm btn-ghost">{t("로그아웃", "Sign out")}</SubmitButton>
          </form>
        </main>
      )}
    </>
  );
}

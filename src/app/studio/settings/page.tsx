import { getViewer } from "@/lib/supabase/server";
import { savePins, signOut, updateProfile } from "../actions";
import { LoginAccounts } from "@/components/studio/LoginAccounts";
import { StudioHead } from "@/components/studio/StudioHead";
import { PrefsForm } from "@/components/studio/PrefsForm";
import { cleanPrefs } from "@/lib/text/style";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { PasswordForm } from "@/components/studio/PasswordForm";
import { getT } from "@/lib/i18n/server";

export default async function Settings() {
  const t = await getT();
  const { sb, profile, user } = await getViewer();
  const [{ data: pinnable }, { data: pins }, { data: logins }] = await Promise.all([
    sb.from("articles").select("id, title").eq("is_public", true).eq("peer_reviewed", true).is("deleted_at", null).order("published_at", { ascending: false }).limit(200),
    sb.from("profile_pins").select("article_id, position").eq("profile_id", profile!.id).order("position"),
    sb.from("profile_logins").select("user_id, status, email, note, created_at").eq("profile_id", profile!.id).neq("status", "declined").order("created_at"),
  ]);
  const owner = user?.id === profile!.id;
  const at = (n: number) => pins?.find((p) => p.position === n)?.article_id ?? "";
  return (
    <div className="stack" style={{ ["--gap" as string]: "28px", maxWidth: 720 }}>
      <StudioHead title={t("설정", "Settings")} note={t("공개 프로필과 로그인 계정 관리", "Public profile and sign-in accounts")} />

      <section className="panel">
        <div className="panel-head"><span className="mono">{t("공개 프로필", "Public profile")}</span><a href={`/authors/${profile!.handle}`} className="mono dim">/authors/{profile!.handle} ↗</a></div>
        <p className="panel-note">{t("멤버 페이지 노출 정보", "Shown on your member page")}</p>
        <form action={updateProfile} className="panel-body stack">
          <div className="field">
            <label htmlFor="h">{t("핸들 (주소)", "Handle (URL)")}</label>
            <input id="h" className="input" value={profile!.handle} readOnly disabled />
            <span className="faint" style={{ fontSize: "0.8rem" }}>{t("이름에서 자동으로 정해집니다 (이름 소문자-성 첫 글자, 예: yeji-c)", "Set from your name automatically (first name-last initial, e.g. yeji-c)")}</span>
          </div>
          <div className="field"><label htmlFor="n">{t("이름", "Display name")}</label><input id="n" name="display_name" className="input" defaultValue={profile!.display_name} maxLength={40} required /></div>
          <div className="field"><label htmlFor="r">{t("직함", "Role title")}</label><input id="r" name="role_title" className="input" defaultValue={profile!.role_title ?? ""} /></div>
          <div className="field"><label htmlFor="b">{t("소개", "Bio")}</label><textarea id="b" name="bio" className="textarea" defaultValue={profile!.bio ?? ""} maxLength={600} /></div>
          <SubmitButton pending={t("저장 중…", "Saving…")} className="btn btn-gold btn-start">{t("프로필 저장", "Save profile")}</SubmitButton>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><span className="mono">{t("로그인 비밀번호", "Sign-in password")}</span></div>
        <p className="panel-note">{t("설정하면 이메일과 비밀번호로 바로 작업실에 들어올 수 있습니다", "Set one to sign in straight to the studio with email and password")}</p>
        <PasswordForm email={user?.email ?? ""} />
      </section>

      <section className="panel">
        <div className="panel-head"><span className="mono">{t("기본값", "Defaults")}</span></div>
        <p className="panel-note">{t("새 원고에 자동 적용 (원고마다 변경 가능)", "Applied to new manuscripts (change per piece anytime)")}</p>
        <PrefsForm initial={cleanPrefs(profile!.prefs)} />
      </section>

      <section className="panel">
        <div className="panel-head"><span className="mono">{t("하이라이트 (3)", "Highlights (3)")}</span></div>
        <p className="panel-note">{t("개인 페이지 상단 고정 (검수 인증 발행물만)", "Pinned on your page (peer-reviewed only)")}</p>
        <form action={savePins} className="panel-body stack">
          {[1, 2, 3].map((n) => (
            <div key={n} className="field">
              <label htmlFor={`pin${n}`}>#{n}</label>
              <select id={`pin${n}`} name={`pin${n}`} className="select" defaultValue={at(n)}>
                <option value="">—</option>
                {(pinnable ?? []).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
          ))}
          {!(pinnable ?? []).length && <p className="dim">{t("고정 가능한 발행물 없음", "No eligible articles")}</p>}
          <SubmitButton pending={t("저장 중…", "Saving…")} className="btn btn-gold btn-start">{t("하이라이트 저장", "Save highlights")}</SubmitButton>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><span className="mono">{t("로그인 계정", "Sign-in accounts")}</span></div>
        <p className="panel-note">{t("다른 메일 계정도 이 프로필로 작업실에 들어올 수 있습니다. 그 계정으로 로그인해 연결을 요청하면 여기서 승인합니다.", "Other email accounts can use this profile too. Sign in with that account and request a link, then approve it here.")}</p>
        <LoginAccounts me={user?.email ?? "—"} owner={owner} rows={logins ?? []} />
      </section>

      <section className="panel">
        <div className="panel-head"><span className="mono">{t("로그아웃", "Sign out")}</span></div>
        <form action={signOut} className="panel-body">
          <SubmitButton pending={t("로그아웃 중…", "Signing out…")} className="btn btn-start">{t("로그아웃", "Sign out")}</SubmitButton>
        </form>
      </section>
    </div>
  );
}

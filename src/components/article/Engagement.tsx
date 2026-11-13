"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isDemo } from "@/lib/env";
import { Reactions } from "@/components/reactions/Reactions";

const VISITOR = "albireo:visitor";

// 익명 방문자 id (기기별)
function visitorId(): string | null {
  try {
    let v = localStorage.getItem(VISITOR);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(VISITOR, v); }
    return v;
  } catch {
    return null;
  }
}

// 조회 기록 + 좋아요
export function Engagement({ id, views, likes }: { id: string; views: number; likes: number }) {
  const [v, setV] = useState(views);
  const [l, setL] = useState(likes);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    const visitor = visitorId();
    if (!visitor) return;
    const sb = supabaseBrowser();
    const seen = `albireo:seen:${id}`;
    let fresh = true;
    try { fresh = !sessionStorage.getItem(seen); sessionStorage.setItem(seen, "1"); } catch {}
    if (fresh) sb.rpc("track_view", { a: id, v: visitor }).then(({ data }) => { if (typeof data === "number") setV(data); });
    sb.rpc("like_state", { a: id, v: visitor }).then(({ data }) => setLiked(!!data));
  }, [id]);

  // 반환값: 바뀐 좋아요 상태 (실패 시 null)
  const toggle = async (): Promise<boolean | null> => {
    const visitor = visitorId();
    if (busy) return null;
    // 데모 모드: 화면에서만 반영
    if (isDemo) { const n = !liked; setLiked(n); setL((x) => x + (n ? 1 : -1)); return n; }
    if (!visitor) return null;
    setBusy(true);
    const { data } = await supabaseBrowser().rpc("toggle_like", { a: id, v: visitor });
    setBusy(false);
    const row = data?.[0];
    if (!row) return null;
    setLiked(row.liked);
    setL(row.likes);
    return row.liked;
  };

  return (
    <div className="engage">
      <Reactions liked={liked} likes={l} onToggle={toggle} busy={busy} />
      <span className="mono faint">{v} views</span>
    </div>
  );
}

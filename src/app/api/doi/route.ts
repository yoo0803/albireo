import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/supabase/server";
import { lookupReference } from "@/lib/cite/doi";
import { normalizeDoi } from "@/lib/cite/apa";
import { getT } from "@/lib/i18n/server";

// DOI → 제목 · 링크 · APA (멤버 전용)
export async function GET(req: NextRequest) {
  const t = await getT();
  const { profile } = await getViewer();
  if (!profile?.is_member) return NextResponse.json({ error: "members only" }, { status: 401 });

  const doi = normalizeDoi(req.nextUrl.searchParams.get("id") ?? "");
  if (!doi) return NextResponse.json({ error: t("DOI 형식 오류", "Invalid DOI") }, { status: 400 });

  const ref = await lookupReference(doi);
  if (!ref) return NextResponse.json({ error: t("DOI 조회 실패", "DOI lookup failed") }, { status: 404 });
  return NextResponse.json(ref, { headers: { "Cache-Control": "private, max-age=3600" } });
}

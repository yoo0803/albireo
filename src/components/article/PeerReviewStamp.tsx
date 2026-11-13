"use client";
import { Seal } from "@/components/art/Seal";
import { useT } from "@/lib/i18n/client";

type Props = { reviewed: boolean; count: number; required?: number; date?: string | null };

// 피어리뷰 낙관
export function PeerReviewStamp({ reviewed, count, required = 2, date }: Props) {
  const t = useT();
  return (
    <div className={`stamp ${reviewed ? "" : "pending"}`} role="img" aria-label={reviewed ? `Peer-reviewed by ${count} members` : `Review ${count}/${required}`}>
      <Seal lines={t("검|수", "REV|IEW").split("|")} pending={!reviewed} size={72} />
      <div className="stamp-cap">
        <span className="serif" style={{ fontWeight: 600 }}>{reviewed ? t("검수 완료", "Reviewed") : t("검수 대기", "Review pending")}</span>
        <span className="label faint">{reviewed ? `Peer-Reviewed · ${count}` : "Pending"}{date ? ` · ${date.slice(0, 10)}` : ""}</span>
      </div>
    </div>
  );
}

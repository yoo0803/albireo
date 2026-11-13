import { ScrambleText } from "@/components/glyph/ScrambleText";
import type { ReactNode } from "react";

// 섹션 머리: 한자 번호 + 영문 디스플레이 + 국문
export function SectionHead({ no, en, ko, aside }: { no: string; en: string; ko?: string; aside?: ReactNode }) {
  return (
    <div className="section-head">
      <span className="section-no" aria-hidden="true">{no}</span>
      <h2>
        <span className="display section-en"><ScrambleText text={en} /></span>
        {ko && <span className="section-ko">{ko}</span>}
      </h2>
      {aside && <div className="section-aside">{aside}</div>}
    </div>
  );
}

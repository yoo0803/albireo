import type { ReactNode } from "react";

// 작업실 섹션 제목 + 한 줄 설명
export function StudioHead({ title, note, children }: { title: string; note: string; children?: ReactNode }) {
  return (
    <div className="studio-head">
      <div>
        <h1 className="studio-title">{title}</h1>
        <p className="studio-note">{note}</p>
      </div>
      {children}
    </div>
  );
}

// H 프로필: 한국 고전문학 제목의 글자가 궁서체로 떨어져 쌓이며 막대그래프가 됨 (국문 + 경영)
const TITLES = ["구운몽", "관동별곡", "어부사시사", "춘향전", "사미인곡", "열하일기", "청산별곡"];

export function ClassicStack() {
  return (
    <span className="classic-stack" aria-hidden="true">
    <span className="classic-chart">
      {TITLES.map((title, c) => {
        const chars = [...title];
        return (
          <span key={title} className="classic-col" style={{ ["--c" as string]: c }}>
            {/* 아래 글자부터 먼저 떨어져 위로 쌓임 → 위에서 아래로 읽힘 */}
            {chars.map((ch, k) => <b key={k} style={{ ["--o" as string]: chars.length - 1 - k }}>{ch}</b>)}
          </span>
        );
      })}
    </span>
    </span>
  );
}

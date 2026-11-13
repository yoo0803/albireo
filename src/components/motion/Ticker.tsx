// 무한 텍스트 테이프
export function Ticker({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const row = (pass: number) => items.map((t, i) => <span key={`${pass}-${i}`}>{t}<i aria-hidden="true">✦</i></span>);
  return (
    <div className="ticker" data-reverse={reverse || undefined} aria-hidden="true">
      <div className="ticker-track">{row(0)}{row(1)}</div>
    </div>
  );
}

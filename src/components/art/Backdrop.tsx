import { Cover } from "./Cover";

// 공간 배경: 생성 커버를 한지 바탕 위에 흐리게 (멤버 = 개인 톤, 공용 = 청·금)
export function Backdrop({ seed, tone, local = false }: { seed: string; tone: string; local?: boolean }) {
  return (
    <div className="backdrop" data-tone={tone} data-local={local || undefined} aria-hidden="true">
      <Cover seed={seed} d={tone} className="backdrop-art" mark={false} base="#f2ede1" />
    </div>
  );
}

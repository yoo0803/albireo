import Link from "next/link";
import { AsciiPiece } from "@/components/ascii/AsciiPiece";
import { isPiece } from "@/components/ascii/pieces";
import { TEAM } from "@/content/team";
import { Reveal } from "@/components/motion/Reveal";

const ROT = ["-2.5deg", "1.8deg", "-1deg", "2.6deg"];

// 멤버 스크랩 보드
export function CrewBoard() {
  return (
    <div className="crew">
      {TEAM.map((m, i) => (
        <Reveal key={m.handle} delay={i * 120}>
          <Link href={`/authors/${m.handle}`} className="crew-card" data-d={m.discipline} style={{ ["--r" as string]: ROT[i % 4] }}>
            <span className="tape" aria-hidden="true" />
            <span className="crew-lens">{isPiece(m.piece) && <AsciiPiece piece={m.piece} className="ascii-fit" label={`${m.name} · ${m.major}`} />}</span>
            <span className="crew-name">{m.name}</span>
            <span className="crew-role">{m.role}</span>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

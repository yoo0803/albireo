import Link from "next/link";
import { ScrambleText } from "@/components/glyph/ScrambleText";

export default function NotFound() {
  return (
    <main id="main" className="wrap" style={{ minHeight: "80dvh", display: "grid", placeContent: "center", gap: 20, textAlign: "center" }}>
      <p className="mono dim">Signal lost (404)</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 10vw, 8rem)" }}><ScrambleText text="Off orbit" trigger="mount" /></h1>
      <Link href="/" className="btn" style={{ justifySelf: "center" }}>Return to Albireo</Link>
    </main>
  );
}

import { strokeBox, unpack, type Stroke } from "@/lib/board/model";
import { strokePath } from "./ink";

// 필기 인식: 브라우저 내장 인식기 → 없으면 OCR (tesseract.js, 처음 한 번 언어 데이터 내려받기)
type Recognizer = {
  startDrawing: (o: object) => { addStroke: (s: unknown) => void; getPrediction: () => Promise<{ text: string }[]> };
  finish: () => void;
};
type HWNavigator = Navigator & { createHandwritingRecognizer?: (o: object) => Promise<Recognizer> };
type HWStroke = new () => { addPoint: (p: { x: number; y: number; t: number }) => void };

async function native(strokes: Stroke[], lang: "ko" | "en"): Promise<string | null> {
  const nav = navigator as HWNavigator;
  const Ctor = (window as unknown as { HandwritingStroke?: HWStroke }).HandwritingStroke;
  if (!nav.createHandwritingRecognizer || !Ctor) return null;
  try {
    const r = await nav.createHandwritingRecognizer({ languages: [lang] });
    const d = r.startDrawing({ recognitionType: "text" });
    let t = 0;
    for (const s of strokes) {
      const hs = new Ctor();
      for (const [x, y] of unpack(s.pts)) hs.addPoint({ x, y, t: (t += 8) });
      d.addStroke(hs);
    }
    const p = await d.getPrediction();
    r.finish();
    return p?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

// 획을 흰 바탕 검은 글씨로 그리기
function rasterize(strokes: Stroke[]): HTMLCanvasElement {
  const boxes = strokes.map(strokeBox);
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
  const w = Math.max(...boxes.map((b) => b.x + b.w)) - x, h = Math.max(...boxes.map((b) => b.y + b.h)) - y;
  const scale = Math.min(4, Math.max(1, 140 / Math.max(40, h)));
  const pad = 30;
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * scale + pad * 2);
  c.height = Math.ceil(h * scale + pad * 2);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.translate(pad, pad);
  g.scale(scale, scale);
  g.translate(-x, -y);
  g.fillStyle = "#000";
  for (const s of strokes) g.fill(new Path2D(strokePath({ ...s, size: Math.max(s.size, 3) })));
  return c;
}

export async function recognize(strokes: Stroke[], lang: "ko" | "en", onProgress?: (p: number) => void): Promise<string> {
  if (!strokes.length) return "";
  const n = await native(strokes, lang);
  if (n) return n;
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang === "ko" ? ["kor", "eng"] : ["eng"], 1, {
    logger: (m: { status: string; progress: number }) => { if (m.status === "recognizing text") onProgress?.(m.progress); },
  });
  try {
    const { data } = await worker.recognize(rasterize(strokes));
    return data.text.replace(/\s+\n/g, "\n").trim();
  } finally {
    await worker.terminate();
  }
}

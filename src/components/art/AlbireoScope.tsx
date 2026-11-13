"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

// 망원경 시야 속 알비레오: 디더 · 입자 · 실측값 기반
// 북쪽 위 · 동쪽 왼쪽. A–B 각거리 ≈ 35″, 위치각 54°. 등급 A 3.1 · B 5.1 (광도비 ≈ 5.8)
// 가이아: A ≈ 365광년 (오차 큼) · B ≈ 395광년. A = Aa(K2 II) + Ac(B8), 0.4″ · P ≈ 122년
// 끌기: 시선 방향으로 돌려 깊이 차이 보기 · 누르고 있기: A 확대 (Aa · Ac 분해)

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// 레트로 팔레트: 밤 · 남색 · 크림 · 금빛 · 물빛
const PALETTE: RGB[] = ["#090b12", "#121729", "#1d2442", "#2e3a66", "#2c5aa0", "#6f9be0", "#c9dcff", "#f2ede1", "#fff4d6", "#e8a64c", "#c08a1f", "#8a4b1a", "#4a2c1a"].map(hex);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

// B−V 기반 색
const COL_A: RGB = [255, 186, 112]; // Aa K2 II (B−V +1.13)
const COL_C: RGB = [205, 222, 255]; // Ac B8 (B−V +0.09)
const COL_B: RGB = [150, 186, 255]; // B  B8Ve (B−V −0.10)

const SEP = 35.3, PA = (54 * Math.PI) / 180; // ″, 북→동
const DIST_A = 365, DIST_B = 395; // 광년 (가이아)
const P_INNER = 122; // 년

export function AlbireoScope({ className }: { className?: string }) {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<"sky" | "depth" | "zoom">("sky");

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let N = 160, buf = new Float32Array(N * N * 3), img = ctx.createImageData(N, N);
    let raf = 0, visible = true, frame = 0;

    const size = () => {
      const w = cv.clientWidth || 320;
      N = Math.max(120, Math.min(200, Math.round(w / 3))); // 화면 3px = 1점
      cv.width = N; cv.height = N;
      buf = new Float32Array(N * N * 3);
      img = ctx.createImageData(N, N);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);

    // 배경 별 (은하수 쪽: 많고 어두움) · 시드 고정
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const field = Array.from({ length: 260 }, () => {
      const warm = rnd();
      return { x: rnd() * 2 - 1, y: rnd() * 2 - 1, z: rnd(), m: Math.pow(rnd(), 3.2), c: (warm < 0.3 ? [255, 214, 170] : warm < 0.7 ? [240, 236, 226] : [190, 210, 255]) as RGB, tw: rnd() * 6.28 };
    });
    // 빛 입자: 별에서 흩어지는 광자
    type P = { x: number; y: number; vx: number; vy: number; life: number; c: RGB; a: number };
    const parts: P[] = [];

    // 입력: 끌기 → 회전(깊이), 누르기 → 확대
    const st = { yaw: 0, yawGoal: 0, zoom: 0, zoomGoal: 0, drag: false, lastX: 0, moved: 0, hover: { x: 0, y: 0 } };
    const down = (e: PointerEvent) => { st.drag = true; st.lastX = e.clientX; st.moved = 0; st.zoomGoal = 1; cv.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      st.hover.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      st.hover.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!st.drag) return;
      const dx = e.clientX - st.lastX;
      st.lastX = e.clientX; st.moved += Math.abs(dx);
      st.yawGoal = Math.max(-1.1, Math.min(1.1, st.yawGoal + dx / 220));
      if (st.moved > 8) st.zoomGoal = 0; // 끌면 확대 대신 회전
    };
    const up = () => { st.drag = false; st.zoomGoal = 0; };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", () => { if (!st.drag) st.hover = { x: 0, y: 0 }; });

    // 점 퍼짐 함수 (가우스) 누적
    const splat = (cx: number, cy: number, sigma: number, c: RGB, k: number) => {
      const r = Math.ceil(sigma * 3);
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(N - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(N - 1, Math.ceil(cy + r));
      const inv = 1 / (2 * sigma * sigma);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        const w = Math.exp(-d2 * inv) * k;
        if (w < 0.002) continue;
        const i = (y * N + x) * 3;
        buf[i] += c[0] * w; buf[i + 1] += c[1] * w; buf[i + 2] += c[2] * w;
      }
    };
    // 회절 십자 (반사망원경 느낌, 약하게)
    const spikes = (cx: number, cy: number, len: number, c: RGB, k: number) => {
      for (let d = 2; d < len; d++) {
        const w = k * (1 - d / len) ** 2;
        for (const [x, y] of [[cx + d, cy], [cx - d, cy], [cx, cy + d], [cx, cy - d]]) {
          const xi = Math.round(x), yi = Math.round(y);
          if (xi < 0 || yi < 0 || xi >= N || yi >= N) continue;
          const i = (yi * N + xi) * 3;
          buf[i] += c[0] * w; buf[i + 1] += c[1] * w; buf[i + 2] += c[2] * w;
        }
      }
    };

    let lastHud = "sky";
    const draw = () => {
      frame++;
      st.yaw += (st.yawGoal - st.yaw) * 0.08;
      if (!st.drag) st.yawGoal *= 0.985; // 놓으면 천천히 정면으로
      st.zoom += (st.zoomGoal - st.zoom) * 0.07;
      const nextHud = st.zoom > 0.5 ? "zoom" : Math.abs(st.yaw) > 0.18 ? "depth" : "sky";
      if (nextHud !== lastHud) { lastHud = nextHud; setHud(nextHud); }

      buf.fill(0);
      const C = N / 2, R = N * 0.47; // 시야 원
      // 하늘 바탕: 은하수 띠 (남서→북동, 아주 옅게)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const u = (x - C) / R, v = (y - C) / R;
        const band = Math.exp(-((u * 0.6 + v * 0.8 + 0.15) ** 2) * 3);
        const i = (y * N + x) * 3;
        buf[i] = 8 + band * 9; buf[i + 1] = 10 + band * 11; buf[i + 2] = 18 + band * 17;
      }

      const zoom = st.zoom;
      const scale = 1 + zoom * 2; // 확대 배율 (A 주변)
      const yaw = st.yaw;
      // 하늘 좌표 (″) → 화면: 북 위, 동 왼쪽. 1″ = px
      const px = (R * 0.62) / SEP;
      // A–B 벡터 (A 기준)
      const bx = -Math.sin(PA) * SEP, by = -Math.cos(PA) * SEP;
      // 중심: 평소 A·B 중간, 확대 시 A
      const midX = bx / 2 * (1 - zoom), midY = by / 2 * (1 - zoom);
      // 깊이 (광년 → 화면 가로 이동). B가 30광년 더 멀다
      const depthK = 1.6; // ″ per ly (표현용)
      const project = (sx: number, sy: number, depthLy: number) => {
        const x = (sx - midX) * Math.cos(yaw) + depthLy * depthK * Math.sin(yaw);
        return [C + x * px * scale, C + (sy - midY) * px * scale];
      };

      // 배경 별: 시차 (가까운 것 많이 이동), 미세한 일주 표류
      const drift = reduce ? 0 : frame * 0.00025;
      for (const f of field) {
        const sx = ((f.x + drift + 1) % 2) - 1, sy = f.y;
        const x = C + (sx * R + Math.sin(yaw) * (f.z - 0.5) * 40) * (1 + zoom * 1.5);
        const y = C + sy * R * (1 + zoom * 1.5);
        const tw = 0.75 + 0.25 * Math.sin(frame * 0.05 + f.tw);
        splat(x, y, 0.55, f.c, (0.06 + f.m * 1.0) * tw * (1 - zoom * 0.85));
      }

      // 시선 깊이선: 돌렸을 때 A·B에서 관측자 쪽으로 점선
      const [ax, ay] = project(0, 0, 0);
      const [bxS, byS] = project(bx, by, DIST_B - DIST_A);
      // 관측자 쪽 = 깊이 감소 방향 (돌린 만큼 가로로 보임)
      if (Math.abs(yaw) > 0.05 && zoom < 0.3) {
        const k = Math.min(1, Math.abs(yaw) * 2) * 0.35, dir = -Math.sign(yaw);
        for (let d = 0; d < N; d += 3) {
          for (const [x0, y0] of [[ax, ay], [bxS, byS]]) {
            const xx = x0 + dir * d;
            if (xx >= 0 && xx < N) splat(xx, y0, 0.5, [200, 200, 210], k * (1 - d / N));
          }
        }
      }

      // 시상 (대기 흔들림)
      const seeing = reduce ? 0 : Math.sin(frame * 0.13) * 0.25;
      // B: 5.1등
      splat(bxS + seeing, byS, 1.4, COL_B, 1.2 * (1 - zoom));
      splat(bxS, byS, 3.4, COL_B, 0.18 * (1 - zoom));
      // A: 3.1등 (B의 약 5.8배). 확대 시 Aa · Ac 분해
      const th = reduce ? 0.7 : frame * 0.02; // P ≈ 122년 → 몇 초로 압축
      // 0.4″ 는 시야 배율로 안 보여 따로 확대 (질량비 ≈ Aa 6 : Ac 3.7)
      const [ax0, ay0] = project(0, 0, 0);
      const rIn = zoom * R * 0.3;
      const ox = Math.cos(th) * rIn, oy = Math.sin(th) * rIn * 0.55;
      const aax = ax0 - ox * 0.38, aay = ay0 - oy * 0.38;
      const cx2 = ax0 + ox * 0.62, cy2 = ay0 + oy * 0.62;
      if (zoom > 0.2) {
        // 안쪽 궤도 점선
        for (let k = 0; k < 64; k++) {
          const a2 = (k / 64) * Math.PI * 2;
          splat(ax0 + Math.cos(a2) * rIn * 0.62, ay0 + Math.sin(a2) * rIn * 0.55 * 0.62, 0.45, [200, 205, 225], 0.25 * zoom);
        }
      }
      splat(aax + seeing, aay, 2.1 + zoom * 1.6, COL_A, 1.5);
      splat(aax, aay, 5.2 + zoom * 3, COL_A, 0.22);
      spikes(aax, aay, 12 + zoom * 10, COL_A, 0.35);
      if (zoom > 0.05) {
        splat(cx2, cy2, 1.3 + zoom * 0.9, COL_C, 1.2 * zoom);
        splat(cx2, cy2, 3.2 + zoom * 1.5, COL_C, 0.14 * zoom);
      }
      spikes(bxS, byS, 7, COL_B, 0.22 * (1 - zoom));

      // 광자 입자: 두 별에서 바깥으로
      if (!reduce && frame % 2 === 0) {
        const emit = (x: number, y: number, c: RGB, n: number) => {
          for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, v = 0.25 + Math.random() * 0.5;
            parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 50 + Math.random() * 50, c, a: 0.32 });
          }
        };
        emit(aax, aay, COL_A, 1);
        if (zoom < 0.5) emit(bxS, byS, COL_B, 1);
        if (zoom > 0.3) emit(cx2, cy2, COL_C, 1);
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        // 포인터 쪽으로 살짝 끌림
        p.vx += (C + st.hover.x * R - p.x) * 0.00012;
        p.vy += (C + st.hover.y * R - p.y) * 0.00012;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        splat(p.x, p.y, 0.5, p.c, p.a * Math.min(1, p.life / 40));
      }
      if (parts.length > 500) parts.splice(0, parts.length - 500);

      // 디더: 베이어 4×4 + 팔레트, 시야 원 밖은 검정
      const d = img.data;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 3, o = (y * N + x) * 4;
        const rr = Math.hypot(x - C, y - C) / R;
        if (rr > 1) { d[o] = 6; d[o + 1] = 7; d[o + 2] = 11; d[o + 3] = 255; continue; }
        const vig = 1 - rr ** 4 * 0.5; // 주변 감광
        const b = BAYER[(y & 3) * 4 + (x & 3)] * 46;
        const r0 = Math.min(255, buf[i] * vig) + b, g0 = Math.min(255, buf[i + 1] * vig) + b, b0 = Math.min(255, buf[i + 2] * vig) + b;
        let best = 0, bd = 1e9;
        for (let k = 0; k < PALETTE.length; k++) {
          const p = PALETTE[k];
          const dd = (r0 - p[0]) ** 2 * 0.3 + (g0 - p[1]) ** 2 * 0.59 + (b0 - p[2]) ** 2 * 0.11;
          if (dd < bd) { bd = dd; best = k; }
        }
        const p = PALETTE[best];
        d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255;
      }
      // 시야 테두리 · 십자선
      ctx.putImageData(img, 0, 0);
      ctx.strokeStyle = "rgba(242,237,225,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(242,237,225,0.10)";
      ctx.beginPath(); ctx.moveTo(C - R, C); ctx.lineTo(C - R * 0.12, C); ctx.moveTo(C + R * 0.12, C); ctx.lineTo(C + R, C);
      ctx.moveTo(C, C - R); ctx.lineTo(C, C - R * 0.12); ctx.moveTo(C, C + R * 0.12); ctx.lineTo(C, C + R); ctx.stroke();
    };

    const loop = () => { if (visible) draw(); raf = requestAnimationFrame(loop); };
    if (reduce) { draw(); raf = requestAnimationFrame(function again() { if (st.drag || Math.abs(st.yaw - st.yawGoal) > 0.001 || Math.abs(st.zoom - st.zoomGoal) > 0.001) draw(); raf = requestAnimationFrame(again); }); }
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, []);

  const label = {
    sky: [t("β CYG (북 ↑ 동 ←)", "β CYG (N ↑ E ←)"), t(`A–B ${SEP}″, 위치각 54°, 3.1/5.1등`, `A–B ${SEP}″, PA 54°, mag 3.1/5.1`)],
    depth: [t("시선 방향 깊이", "Depth along the line of sight"), t(`A ≈ ${DIST_A}광년 / B ≈ ${DIST_B}광년 (가이아)`, `A ≈ ${DIST_A} ly / B ≈ ${DIST_B} ly (Gaia)`)],
    zoom: [t("A 확대: 실제 쌍성", "A magnified: a true binary"), t(`Aa (K2 II) + Ac (B8) / 0.4″ / 주기 ≈ ${P_INNER}년`, `Aa (K2 II) + Ac (B8) / 0.4″ / P ≈ ${P_INNER} yr`)],
  }[hud];

  return (
    <div className={`scope ${className ?? ""}`}>
      <canvas ref={ref} className="scope-canvas" role="img" aria-label={t("망원경으로 본 알비레오 A와 B", "Albireo A and B through a telescope")} />
      <div className="scope-hud" aria-live="polite">
        <span>{label[0]}</span>
        <span>{label[1]}</span>
      </div>
      <span className="scope-hint">{t("끌기: 깊이 보기 / 누르고 있기: A 확대", "Drag: see depth / Hold: magnify A")}</span>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { nextConstellation, type Constellation } from './constellations';

interface BurstStar {
  // 归一化坐标（未旋转、未缩放）
  sx: number;
  sy: number;
  r: number;
  peak: number;
  color: string;
  delay: number;
  driftX: number;
  driftY: number;
  trail: number;
  bright: boolean;
  // 每帧复用的屏幕坐标
  px: number;
  py: number;
  p: number;
}

interface Meteor {
  x: number;
  y: number;
  dx: number;
  dy: number;
  len: number;
}

interface Burst {
  x: number;
  y: number;
  t0: number;
  life: number;
  holdEnd: number;
  cos: number;
  sin: number;
  size: number;
  swirl: number;
  shape: Constellation;
  stars: BurstStar[];
  brightest: number;
  edgeWindows: [number, number][];
  band: { x: number; y: number; r: number; a: number }[];
  meteor: Meteor | null;
}

const COLOR = '#E5E5E5';
const WARM = '#EEE3D3';
const COOL = '#DCE3EE';
const MAX_BURSTS = 4;
const LIFE = 1800;
const LONG_LIFE = 2000;
const STAR_FLIGHT = 450;
const MAX_STAGGER = 35;
const LINE_START = 350;
const LINE_END = 950;
const HOLD_END = 1250;
const METEOR_CHANCE = 1 / 8;
const METEOR_START = 250;
const METEOR_DURATION = 450;
const SKIP = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const starRadius = (mag: number) => Math.min(2.6, Math.max(0.9, 2.6 - 0.45 * mag));
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

function makeStar(sx: number, sy: number, r: number, peak: number, color: string, delay: number, bright: boolean): BurstStar {
  // 星尘消散：在径向上偏一点角度，各自漂远一点
  const angle = Math.atan2(sy, sx) + rand(-0.35, 0.35);
  const amount = rand(0.06, 0.12);
  return {
    sx, sy, r, peak, color, delay, bright,
    driftX: Math.cos(angle) * amount,
    driftY: Math.sin(angle) * amount,
    trail: Math.random() < 0.5 ? rand(4, 10) : 0,
    px: 0, py: 0, p: 0,
  };
}

function createBurst(x: number, y: number, t0: number): Burst {
  const shape = nextConstellation();
  const angle = rand(-20, 20) * Math.PI / 180;
  const size = Math.min(85, Math.max(55, Math.min(innerWidth, innerHeight) * 0.08)) * rand(0.9, 1.1) * shape.scale;

  // 由近到远依次飞出；星多时压缩间隔，免得尾巴拖太久
  const n = shape.stars.length;
  const stagger = Math.min(MAX_STAGGER, 300 / Math.max(1, n - 1));
  const order = shape.stars.map((s, i) => [Math.hypot(s.x, s.y), i] as const).sort((a, b) => a[0] - b[0]);
  const delays: number[] = [];
  order.forEach(([, i], k) => { delays[i] = k * stagger; });

  const stars = shape.stars.map((s, i) => makeStar(
    s.x, s.y, starRadius(s.mag), 1,
    s.tint === 'w' ? WARM : s.tint === 'c' ? COOL : COLOR,
    delays[i], s.mag < 1.5,
  ));
  let brightest = 0;
  shape.stars.forEach((s, i) => { if (s.mag < shape.stars[brightest].mag) brightest = i; });

  // 不连线的背景星，像从夜空里剪下一小块
  const fieldCount = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < fieldCount; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(0.4, 1.3);
    stars.push(makeStar(Math.cos(a) * d, Math.sin(a) * d, rand(0.6, 0.9), rand(0.3, 0.5), COLOR, rand(0, 200), false));
  }

  // 连线按长度分配描线时长
  const lengths = shape.edges.map(([a, b]) => Math.hypot(shape.stars[a].x - shape.stars[b].x, shape.stars[a].y - shape.stars[b].y));
  const total = lengths.reduce((s, l) => s + l, 0) || 1;
  let cursor = LINE_START;
  const edgeWindows = lengths.map(l => {
    const start = cursor;
    cursor += ((LINE_END - LINE_START) * l) / total;
    return [start, cursor] as [number, number];
  });

  // 银河光带：沿两颗主星连线的中垂线铺一道淡淡的尘点
  const band: Burst['band'] = [];
  if (shape.band) {
    const sorted = shape.stars.map((s, i) => [s.mag, i] as const).sort((a, b) => a[0] - b[0]);
    const A = shape.stars[sorted[0][1]];
    const B = shape.stars[sorted[1][1]];
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    const ux = A.x - B.x;
    const uy = A.y - B.y;
    const ul = Math.hypot(ux, uy) || 1;
    const count = 90 + Math.floor(Math.random() * 41);
    for (let i = 0; i < count; i++) {
      const along = rand(-1, 1);
      const across = gauss() * 0.22 * (1 - 0.4 * Math.abs(along));
      band.push({
        x: mx - (uy / ul) * along + (ux / ul) * across,
        y: my + (ux / ul) * along + (uy / ul) * across,
        r: rand(0.5, 1),
        a: rand(0.15, 0.45),
      });
    }
  }

  let meteor: Meteor | null = null;
  if (Math.random() < METEOR_CHANCE) {
    const deg = Math.random() < 0.5 ? rand(25, 65) : rand(115, 155);
    const dx = Math.cos(deg * Math.PI / 180);
    const dy = Math.sin(deg * Math.PI / 180);
    const offset = rand(10, 30);
    meteor = { x: x + dx * offset, y: y + dy * offset, dx, dy, len: rand(130, 200) };
  }

  const life = meteor || shape.egg ? LONG_LIFE : LIFE;
  return {
    x, y, t0, life,
    holdEnd: HOLD_END + (life - LIFE),
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    size,
    swirl: Math.random() < 0.5 ? -1 : 1,
    shape, stars, brightest, edgeWindows, band, meteor,
  };
}

function drawBurst(ctx: CanvasRenderingContext2D, b: Burst, now: number) {
  const t = now - b.t0;
  const fade = clamp01((t - b.holdEnd) / (b.life - b.holdEnd));
  const fadeEase = easeOut(fade);
  const twinkle = t > LINE_END && t < b.holdEnd ? Math.sin((Math.PI * (t - LINE_END)) / (b.holdEnd - LINE_END)) : 0;
  const starFade = 1 - clamp01((t - b.holdEnd - 150) / (b.life - b.holdEnd - 150));
  const lineFade = 1 - clamp01((t - b.holdEnd) / 350);
  const toScreenX = (nx: number, ny: number) => b.x + (nx * b.cos - ny * b.sin) * b.size;
  const toScreenY = (nx: number, ny: number) => b.y + (nx * b.sin + ny * b.cos) * b.size;

  for (const s of b.stars) {
    s.p = clamp01((t - s.delay) / STAR_FLIGHT);
    const e = easeOut(s.p);
    // 旋涡飞入：越早越偏，落位时沿弧线收进
    const turn = b.swirl * 0.7 * (1 - e);
    const c = Math.cos(turn);
    const sn = Math.sin(turn);
    const nx = (s.sx * c - s.sy * sn) * e + s.driftX * fadeEase;
    const ny = (s.sx * sn + s.sy * c) * e + s.driftY * fadeEase;
    s.px = toScreenX(nx, ny);
    s.py = toScreenY(nx, ny);
  }

  ctx.strokeStyle = COLOR;
  ctx.fillStyle = COLOR;

  // 点击闪光
  if (t < 260) {
    const p = t / 260;
    ctx.globalAlpha = 0.6 * (1 - p);
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2 + 8 * easeOut(p), 0, Math.PI * 2);
    ctx.stroke();
  }

  // 银河光带
  if (b.band.length) {
    const bandAlpha = clamp01((t - 300) / 600) * (1 - fade);
    if (bandAlpha > 0) {
      for (const d of b.band) {
        ctx.globalAlpha = d.a * bandAlpha;
        ctx.beginPath();
        ctx.arc(toScreenX(d.x, d.y), toScreenY(d.x, d.y), d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 连线与描线光头
  if (lineFade > 0 && b.shape.edges.length) {
    ctx.globalAlpha = 0.35 * lineFade;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    b.shape.edges.forEach(([a, c], i) => {
      const [start, end] = b.edgeWindows[i];
      const q = clamp01((t - start) / (end - start));
      if (!q) return;
      const A = b.stars[a];
      const B = b.stars[c];
      ctx.moveTo(A.px, A.py);
      ctx.lineTo(A.px + (B.px - A.px) * q, A.py + (B.py - A.py) * q);
    });
    ctx.stroke();
    ctx.globalAlpha = 0.9 * lineFade;
    b.shape.edges.forEach(([a, c], i) => {
      const [start, end] = b.edgeWindows[i];
      const q = (t - start) / (end - start);
      if (q <= 0 || q >= 1) return;
      const A = b.stars[a];
      const B = b.stars[c];
      ctx.beginPath();
      ctx.arc(A.px + (B.px - A.px) * q, A.py + (B.py - A.py) * q, 1.1, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 星点、柔光、星尘拖尾
  for (const s of b.stars) {
    if (!s.p) continue;
    const alpha = Math.min(1, s.p * 2) * starFade * s.peak * (s.bright ? 1 - 0.35 * twinkle : 1);
    if (alpha <= 0) continue;
    const r = s.r * easeOut(s.p) * (1 + 0.3 * Math.sin(Math.PI * s.p));
    ctx.fillStyle = s.color;
    if (s.bright) {
      ctx.globalAlpha = 0.18 * alpha;
      ctx.beginPath();
      ctx.arc(s.px, s.py, r * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(s.px, s.py, r, 0, Math.PI * 2);
    ctx.fill();
    if (s.trail && fade > 0) {
      const dl = Math.hypot(s.driftX, s.driftY) || 1;
      const ux = (s.driftX * b.cos - s.driftY * b.sin) / dl;
      const uy = (s.driftX * b.sin + s.driftY * b.cos) / dl;
      const L = s.trail * Math.min(1, fade * 3);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = 0.7 * alpha;
      ctx.lineWidth = r * 0.8;
      ctx.beginPath();
      ctx.moveTo(s.px, s.py);
      ctx.lineTo(s.px - ux * L, s.py - uy * L);
      ctx.stroke();
    }
  }

  // 衍射星芒：最亮那颗在闪烁峰值长出十字
  if (twinkle > 0.05) {
    const s = b.stars[b.brightest];
    const L = s.r * 7 * twinkle;
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = 0.5 * twinkle * starFade;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(s.px - L, s.py);
    ctx.lineTo(s.px + L, s.py);
    ctx.moveTo(s.px, s.py - L);
    ctx.lineTo(s.px, s.py + L);
    ctx.stroke();
  }

  // 流星
  const m = b.meteor;
  if (m) {
    const mp = (t - METEOR_START) / METEOR_DURATION;
    if (mp > 0 && mp < 1) {
      const travel = easeOut(mp) * m.len;
      const hx = m.x + m.dx * travel;
      const hy = m.y + m.dy * travel;
      const tail = Math.min(travel, 70);
      const tx = hx - m.dx * tail;
      const ty = hy - m.dy * tail;
      const alpha = mp < 0.7 ? 1 : (1 - mp) / 0.3;
      const gradient = ctx.createLinearGradient(tx, ty, hx, hy);
      gradient.addColorStop(0, 'rgba(229,229,229,0)');
      gradient.addColorStop(1, 'rgba(229,229,229,0.85)');
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = COLOR;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export default function ClickConstellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const bursts: Burst[] = [];
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = bursts.length - 1; i >= 0; i--) if (now - bursts[i].t0 >= bursts[i].life) bursts.splice(i, 1);
      for (const b of bursts) drawBurst(ctx, b, now);
      ctx.globalAlpha = 1;
      // 没有星座时停掉循环，空闲零开销
      raf = bursts.length ? requestAnimationFrame(frame) : 0;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if ((e.target as Element | null)?.closest?.(SKIP)) return;
      if (bursts.length >= MAX_BURSTS) bursts.shift();
      bursts.push(createBurst(e.clientX, e.clientY, performance.now()));
      if (!raf) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerdown', onDown);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9997,
        mixBlendMode: 'difference',
      }}
    />
  );
}

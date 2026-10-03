import { BRAND_MARK } from '../components/brand/brandMarkPaths';

type Point = readonly [number, number];

// 星月图形标三部分，按「月托星升」顺序：0 新月、1 星、2 光芒
const PARTS = [BRAND_MARK.moon, BRAND_MARK.star, BRAND_MARK.ray];
const SEGMENT_STEPS = 16;
// Logo 在 660×540 叠加层里的高度（SVG 单位）；粒子世界坐标 1 单位 = 100 SVG 单位
export const MARK_HEIGHT = 300;
export const MARK_SCALE = MARK_HEIGHT / BRAND_MARK.height;
// 路径只含 M / C / Z，三次贝塞尔细分成折线
function polygon(d: string): Point[] {
  const tokens = d.match(/[MCZ]|-?\d*\.?\d+/g) ?? [];
  const points: Point[] = [];
  let i = 0, x = 0, y = 0;
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === 'M') {
      x = +tokens[i++]; y = +tokens[i++];
      points.push([x, y]);
    } else if (command === 'C') {
      while (i < tokens.length && !/[MCZ]/.test(tokens[i])) {
        const [x1, y1, x2, y2, x3, y3] = tokens.slice(i, i + 6).map(Number);
        i += 6;
        for (let s = 1; s <= SEGMENT_STEPS; s++) {
          const t = s / SEGMENT_STEPS, m = 1 - t;
          points.push([
            m * m * m * x + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * x3,
            m * m * m * y + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * y3,
          ]);
        }
        x = x3; y = y3;
      }
    }
  }
  return points;
}

function inside([px, py]: Point, poly: Point[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function edgeDistance([px, py]: Point, poly: Point[]) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i];
    const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
    best = Math.min(best, Math.hypot(px - ax - dx * t, py - ay - dy * t));
  }
  return best;
}

const polygons = PARTS.map(polygon);
const all = polygons.flat();
const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]));
const minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]));
// Logo 包围盒中心，叠加层 SVG 按同一中心对齐
export const MARK_CENTER: Point = [(minX + maxX) / 2, (minY + maxY) / 2];

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const partAt = (point: Point) => polygons.findIndex(poly => inside(point, poly));

// 泊松圆盘取样：任意两点不近于 spacing，疏密均匀但不成格子；贴边的点略收进轮廓
function lattice(spacing: number) {
  const next = random(20261003), cell = spacing / Math.SQRT2;
  const columns = Math.ceil((maxX - minX) / cell) + 1, rows = Math.ceil((maxY - minY) / cell) + 1;
  const grid = new Int32Array(columns * rows).fill(-1);
  const points: [number, number, number][] = [], active: number[] = [];
  const slot = (x: number, y: number) => Math.floor((y - minY) / cell) * columns + Math.floor((x - minX) / cell);
  const fits = (x: number, y: number) => {
    const cx = Math.floor((x - minX) / cell), cy = Math.floor((y - minY) / cell);
    for (let j = Math.max(0, cy - 2); j <= Math.min(rows - 1, cy + 2); j++) {
      for (let i = Math.max(0, cx - 2); i <= Math.min(columns - 1, cx + 2); i++) {
        const index = grid[j * columns + i];
        if (index >= 0 && Math.hypot(points[index][0] - x, points[index][1] - y) < spacing) return false;
      }
    }
    return true;
  };
  const add = (x: number, y: number, part: number) => {
    grid[slot(x, y)] = points.length; active.push(points.length); points.push([x, y, part]);
  };
  const usable = (x: number, y: number) => {
    const part = partAt([x, y]);
    return part >= 0 && edgeDistance([x, y], polygons[part]) >= spacing * .28 ? part : -1;
  };
  for (let tries = 0; tries < 400; tries++) {
    const x = minX + next() * (maxX - minX), y = minY + next() * (maxY - minY);
    if (!fits(x, y)) continue;
    const part = usable(x, y);
    if (part >= 0) add(x, y, part);
    while (active.length) {
      const at = Math.floor(next() * active.length), [ox, oy] = points[active[at]];
      let placed = false;
      for (let k = 0; k < 30; k++) {
        const angle = next() * Math.PI * 2, distance = spacing * (1 + next());
        const x2 = ox + Math.cos(angle) * distance, y2 = oy + Math.sin(angle) * distance;
        if (x2 < minX || x2 > maxX || y2 < minY || y2 > maxY || !fits(x2, y2)) continue;
        const part2 = usable(x2, y2);
        if (part2 >= 0) { add(x2, y2, part2); placed = true; break; }
      }
      if (!placed) active.splice(at, 1);
    }
  }
  return points
    .map((point, index) => ({ point, rank: (index * .6180339887498949) % 1 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ point }) => point);
}

// 桌面点数不超过降级后的 1320 个粒子，降级时印仍完整；手机预算 800 用更疏的一套
const cache = new Map<number, [number, number, number][]>();
const latticeFor = (count: number) => {
  const spacing = count < 1000 ? 1.58 : 1.36;
  if (!cache.has(spacing)) cache.set(spacing, lattice(spacing));
  return cache.get(spacing)!;
};
export const markPoints = (count: number) => Math.min(count, latticeFor(count).length);

// 超出点阵的粒子与已有点重合，由着色器在成印时隐去
export function markField(count: number) {
  const points = latticeFor(count);
  const field = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const [u, v, part] = points[i % points.length];
    field.set([
      ((u - MARK_CENTER[0]) * MARK_SCALE) / 100,
      (-(v - MARK_CENTER[1]) * MARK_SCALE) / 100,
      (((i * .618034) % 1) - .5) * .02,
      part,
    ], i * 4);
  }
  return field;
}

// 让每个球面粒子飞向离自己最近的印点，过渡时不再是随机乱飞的雾；多余粒子就近隐去
export function alignMark(position: Float32Array, mark: Float32Array, visible: number, scale: number) {
  const count = position.length / 3, ct = Math.cos(.22), st = Math.sin(.22);
  const bx = new Float32Array(count), by = new Float32Array(count);
  for (let i = 0; i < count; i++) { bx[i] = position[i * 3]; by[i] = ct * position[i * 3 + 1] - st * position[i * 3 + 2]; }
  const tx = new Float32Array(visible), ty = new Float32Array(visible);
  for (let j = 0; j < visible; j++) { tx[j] = mark[j * 4] * scale; ty[j] = mark[j * 4 + 1] * scale; }
  const dist = (j: number, i: number) => (tx[j] - bx[i]) ** 2 + (ty[j] - by[i]) ** 2;
  const free = Array.from({ length: visible }, (_, i) => i), assign = new Int32Array(visible);
  for (let j = 0; j < visible; j++) {
    let best = 0, bestD = Infinity;
    for (let k = 0; k < free.length; k++) { const d = dist(j, free[k]); if (d < bestD) { bestD = d; best = k; } }
    assign[j] = free[best]; free[best] = free[free.length - 1]; free.pop();
  }
  const rnd = random(7);
  for (let n = 0; n < visible * 60; n++) {
    const a = (rnd() * visible) | 0, b = (rnd() * visible) | 0;
    if (dist(a, assign[b]) + dist(b, assign[a]) < dist(a, assign[a]) + dist(b, assign[b])) { const t = assign[a]; assign[a] = assign[b]; assign[b] = t; }
  }
  const out = new Float32Array(count * 4);
  for (let j = 0; j < visible; j++) out.set(mark.subarray(j * 4, j * 4 + 4), assign[j] * 4);
  for (let i = visible; i < count; i++) {
    let best = 0, bestD = Infinity;
    for (let j = 0; j < visible; j++) { const d = dist(j, i); if (d < bestD) { bestD = d; best = j; } }
    out.set(mark.subarray(best * 4, best * 4 + 4), i * 4);
  }
  return out;
}

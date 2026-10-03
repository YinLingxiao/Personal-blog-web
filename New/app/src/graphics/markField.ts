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

const polygons = PARTS.map(polygon);
const all = polygons.flat();
const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]));
const minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]));
// Logo 包围盒中心，叠加层 SVG 按同一中心对齐
export const MARK_CENTER: Point = [(minX + maxX) / 2, (minY + maxY) / 2];

// R2 低差异序列取样：顺序确定，少量粒子是大量粒子的前缀，降级后仍铺满三部分
const G = 1.324717957244746;
export function markField(count: number) {
  const field = new Float32Array(count * 4);
  let filled = 0;
  for (let n = 0; filled < count && n < count * 40; n++) {
    const u = minX + ((.5 + n / G) % 1) * (maxX - minX);
    const v = minY + ((.5 + n / (G * G)) % 1) * (maxY - minY);
    const part = polygons.findIndex(poly => inside([u, v], poly));
    if (part < 0) continue;
    field.set([
      ((u - MARK_CENTER[0]) * MARK_SCALE) / 100,
      (-(v - MARK_CENTER[1]) * MARK_SCALE) / 100,
      (((n * .618034) % 1) - .5) * .08,
      part,
    ], filled * 4);
    filled++;
  }
  return field;
}

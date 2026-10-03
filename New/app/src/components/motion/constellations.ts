// 赤经(h)、赤纬(°)、星等、星色倾向（w 偏暖 K/M 型，c 偏冷 B/A 型）
type Tint = 'w' | 'c';
type Star = readonly [ra: number, dec: number, mag: number, tint?: Tint];

interface Catalog {
  stars: readonly Star[];
  edges: readonly (readonly [number, number])[];
  scale?: number;
  band?: boolean;
  // 小星组围绕首颗星放大，免得在大跨度星图里缩成一个点
  groups?: readonly (readonly number[])[];
  groupScale?: number;
}

export interface ConstellationStar {
  x: number;
  y: number;
  mag: number;
  tint?: Tint;
}

export interface Constellation {
  stars: ConstellationStar[];
  edges: (readonly [number, number])[];
  scale: number;
  band: boolean;
  egg: boolean;
}

const regular: Catalog[] = [
  {
    // 北斗七星
    stars: [[11.06, 61.75, 1.8, 'w'], [11.03, 56.38, 2.4], [11.9, 53.69, 2.4], [12.26, 57.03, 3.3], [12.9, 55.96, 1.8], [13.4, 54.93, 2.2], [13.79, 49.31, 1.9]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  {
    // 仙后座
    stars: [[0.15, 59.15, 2.3], [0.68, 56.54, 2.2, 'w'], [0.95, 60.72, 2.2], [1.43, 60.24, 2.7], [1.91, 63.67, 3.4]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    // 南十字
    stars: [[12.44, -63.1, 0.8, 'c'], [12.8, -59.69, 1.3, 'c'], [12.52, -57.11, 1.6, 'w'], [12.25, -58.75, 2.8], [12.36, -60.4, 3.6]],
    edges: [[2, 0], [1, 3]],
  },
  {
    // 天鹅座
    stars: [[20.69, 45.28, 1.3, 'c'], [20.37, 40.26, 2.2], [19.51, 27.96, 3.1, 'w'], [20.77, 33.97, 2.5], [19.75, 45.13, 2.9]],
    edges: [[0, 1], [1, 2], [4, 1], [1, 3]],
  },
  {
    // 猎户座
    stars: [[5.92, 7.41, 0.5, 'w'], [5.42, 6.35, 1.6, 'c'], [5.68, -1.94, 1.8], [5.6, -1.2, 1.7], [5.53, -0.3, 2.2], [5.8, -9.67, 2.1], [5.24, -8.2, 0.1, 'c'], [5.59, 9.93, 3.4]],
    edges: [[0, 7], [7, 1], [2, 3], [3, 4], [0, 2], [1, 4], [2, 5], [4, 6]],
  },
  {
    // 天琴座：织女一 + ε ζ 小三角 + 平行四边形
    stars: [[18.62, 38.78, 0.0, 'c'], [18.74, 39.67, 4.7], [18.75, 37.61, 4.3], [18.91, 36.9, 4.3], [18.98, 32.69, 3.2], [18.83, 33.36, 3.5]],
    edges: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 2]],
  },
  {
    // 天蝎座：头 → 心宿二 → 尾钩
    stars: [
      [16.49, -26.43, 1.0, 'w'], [16.35, -25.59, 2.9], [16.01, -22.62, 2.3], [16.09, -19.81, 2.6, 'c'], [15.98, -26.11, 2.9],
      [16.6, -28.22, 2.8], [16.84, -34.29, 2.3], [16.86, -38.05, 3.0], [16.91, -42.36, 3.6], [17.2, -43.24, 3.3],
      [17.62, -43.0, 1.9], [17.79, -40.13, 3.0], [17.71, -39.03, 2.4], [17.56, -37.1, 1.6, 'c'], [17.51, -37.3, 2.7],
    ],
    edges: [[3, 2], [2, 4], [2, 1], [1, 0], [0, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14]],
  },
  {
    // 狮子座：镰刀 + 后半身
    stars: [[10.14, 11.97, 1.4, 'c'], [10.12, 16.76, 3.5], [10.33, 19.84, 2.0, 'w'], [10.28, 23.42, 3.4], [9.88, 26.01, 3.9], [9.76, 23.77, 3.0], [11.82, 14.57, 2.1], [11.24, 20.52, 2.6], [11.24, 15.43, 3.3]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 7], [7, 6], [6, 8], [8, 0]],
  },
  {
    // 小熊座：北极星在勺柄末端
    stars: [[2.53, 89.26, 2.0], [17.54, 86.59, 4.4], [16.77, 82.04, 4.2], [15.73, 77.79, 4.3], [14.85, 74.16, 2.1, 'w'], [15.35, 71.83, 3.0], [16.29, 75.76, 5.0]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
  {
    // 双子座：北河二、北河三各领一条身子
    stars: [[7.58, 31.89, 1.6, 'c'], [7.76, 28.03, 1.1, 'w'], [7.19, 30.25, 4.4], [6.73, 25.13, 3.0], [6.38, 22.51, 2.9], [7.34, 21.98, 3.5], [6.63, 16.4, 1.9], [6.75, 12.9, 3.4]],
    edges: [[0, 1], [0, 2], [2, 3], [3, 4], [1, 5], [5, 6], [5, 7]],
  },
];

const eggs: Catalog[] = [
  {
    // 昴星团：一簇小星，不连线
    stars: [[3.791, 24.105, 2.9, 'c'], [3.819, 24.053, 3.6], [3.748, 24.113, 3.7], [3.764, 24.368, 3.9], [3.772, 23.948, 4.2], [3.753, 24.467, 4.3], [3.82, 24.137, 5.1], [3.747, 24.289, 5.4]],
    edges: [],
    scale: 0.55,
  },
  {
    // 牛郎织女：织女三星 + 河鼓「扁担」，中间隔一道银河
    stars: [[18.62, 38.78, 0.0, 'c'], [18.74, 39.67, 4.7], [18.75, 37.61, 4.3], [19.85, 8.87, 0.8], [19.92, 6.41, 3.7], [19.77, 10.61, 2.7, 'w']],
    edges: [[0, 1], [1, 2], [2, 0], [5, 3], [3, 4]],
    scale: 1.3,
    band: true,
    groups: [[0, 1, 2], [3, 4, 5]],
    groupScale: 3,
  },
];

// 切平面投影：北在上、东在左，以平均方向为中心，最远星归一到 1（北极附近也不变形）
function project({ stars, edges, scale = 1, band = false, groups = [], groupScale = 1 }: Catalog, egg: boolean): Constellation {
  const vectors = stars.map(([ra, dec]) => {
    const a = (ra * 15 * Math.PI) / 180;
    const d = (dec * Math.PI) / 180;
    return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)] as const;
  });
  const sum = vectors.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
  const len = Math.hypot(...sum);
  const c = [sum[0] / len, sum[1] / len, sum[2] / len];
  const el = Math.hypot(c[0], c[1]) || 1;
  const e = [-c[1] / el, c[0] / el, 0];
  const n = [c[1] * e[2] - c[2] * e[1], c[2] * e[0] - c[0] * e[2], c[0] * e[1] - c[1] * e[0]];
  const dot = (v: readonly number[], w: readonly number[]) => v[0] * w[0] + v[1] * w[1] + v[2] * w[2];
  const points = vectors.map((v, i) => ({ x: -dot(v, e), y: -dot(v, n), mag: stars[i][2], tint: stars[i][3] }));
  for (const [anchor, ...members] of groups) {
    for (const i of members) {
      points[i].x = points[anchor].x + (points[i].x - points[anchor].x) * groupScale;
      points[i].y = points[anchor].y + (points[i].y - points[anchor].y) * groupScale;
    }
  }
  const radius = Math.max(...points.map(p => Math.hypot(p.x, p.y)));
  return {
    stars: points.map(p => ({ ...p, x: p.x / radius, y: p.y / radius })),
    edges: [...edges],
    scale,
    band,
    egg,
  };
}

export const constellations = regular.map(c => project(c, false));
export const easterEggs = eggs.map(c => project(c, true));

const EGG_CHANCE = 1 / 12;
let bag: number[] = [];
let last = -1;

// 洗牌袋：一轮内不重复，重洗时避免与上一轮末尾相接；彩蛋另抽，不消耗洗牌袋
export function nextConstellation(): Constellation {
  if (Math.random() < EGG_CHANCE) return easterEggs[Math.floor(Math.random() * easterEggs.length)];
  if (!bag.length) {
    bag = constellations.map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (bag.length > 1 && bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  }
  last = bag.pop() ?? 0;
  return constellations[last];
}

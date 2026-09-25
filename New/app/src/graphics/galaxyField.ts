export const GALAXY_TILT = .52;
export const GALAXY_TWIST = -.32;
export const GALAXY_STRIDE = 4;

const hash = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const gauss = (n: number) => hash(n) + hash(n + .37) + hash(n + .71) - 1.5;

export function galaxyField(count: number) {
  const field = new Float32Array(count * GALAXY_STRIDE);
  for (let i = 0; i < count; i++) {
    const kind = hash(i + 1), h = hash(i * 3.1 + 7), a = hash(i * 5.7 + 11) * Math.PI * 2;
    let r: number, theta: number, y: number, light: number;
    if (kind < .14) {
      r = .04 + .34 * Math.pow(h, 1.7);
      theta = a;
      y = gauss(i * 2.3 + 5) * .16 * (1 - r);
      light = .78 + .22 * hash(i * 9.1);
    } else if (kind < .84) {
      r = .16 + 1.6 * Math.pow(h, 1.2);
      theta = (i % 2) * Math.PI + Math.log(r / .16) / .53 + gauss(i * 1.7 + 3) * (.2 + .06 * r);
      r *= 1 + gauss(i * 4.3 + 1) * .07;
      y = gauss(i * 6.1 + 2) * .04 * (1.3 - r * .4);
      light = .36 + .52 * Math.exp(-r * 1.15) + .12 * hash(i * 2.9);
    } else {
      r = .55 + 1.35 * Math.sqrt(h);
      theta = a;
      y = gauss(i * 8.7 + 4) * .14;
      light = .24 + .3 * hash(i * 3.7);
    }
    field.set([Math.cos(theta) * r, y, Math.sin(theta) * r, Math.min(1, light)], i * GALAXY_STRIDE);
  }
  return field;
}

export function projectGalaxy(x: number, y: number, z: number, spin = 0) {
  const cs = Math.cos(spin), ss = Math.sin(spin);
  const sx = cs * x - ss * z, sz = ss * x + cs * z;
  const ct = Math.cos(GALAXY_TILT), st = Math.sin(GALAXY_TILT);
  const ty = ct * y - st * sz, tz = st * y + ct * sz;
  const cw = Math.cos(GALAXY_TWIST), sw = Math.sin(GALAXY_TWIST);
  return { x: cw * sx - sw * ty, y: sw * sx + cw * ty, z: tz };
}

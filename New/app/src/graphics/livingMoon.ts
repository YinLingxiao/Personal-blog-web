import { BufferAttribute, BufferGeometry, CanvasTexture, Color, PerspectiveCamera, Points, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three';
import { GALAXY_STRIDE, GALAXY_TILT, GALAXY_TWIST, galaxyField } from './galaxyField';

export interface MoonScene {
  resize: () => void;
  scroll: (progress: number, release?: number) => void;
  galaxy: (open: boolean) => void;
  pause: (paused: boolean) => void;
  dispose: () => void;
}
interface Options { mobile: boolean; arrival: boolean; galaxy?: boolean; surface?: HTMLElement; onReady: () => void; onFallback: () => void }
const ease = (x: number) => {
  let t = x;
  for (let i = 0; i < 6; i++) {
    const f = 3 * (1 - t) * (1 - t) * t * .22 + 3 * (1 - t) * t * t * .36 + t * t * t - x;
    const d = 3 * (1 - t) * (1 - t) * .22 + 6 * (1 - t) * t * (.36 - .22) + 3 * t * t * (1 - .36);
    if (Math.abs(d) < 1e-6) break;
    t = Math.max(0, Math.min(1, t - f / d));
  }
  return 3 * (1 - t) * (1 - t) * t + 3 * (1 - t) * t * t + t * t * t;
};
const TRANSFORM_MS = 780, GATHER_SPAN = .42, UNFOLD_DELAY = .16, GALAXY_SPIN = .045;
export function createMoon(host: HTMLElement, options: Options): MoonScene {
  const renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(new Color('#050505'), 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, options.mobile ? 1 : 1.5));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, .1, 20);
  camera.position.z = 5;
  const count = options.mobile ? 800 : 2400;
  const position = new Float32Array(count * 3), staff = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i + .5) / count * 2, r = Math.sqrt(1 - y * y), phi = i * Math.PI * (3 - Math.sqrt(5));
    position.set([Math.cos(phi) * r * 1.3, y * 1.3, Math.sin(phi) * r * 1.3], i * 3);
    const x = ((i * 37 % count) / count - .5) * 6.3;
    staff.set([x, ((i % 5) - 2) * .2 + Math.sin(x * .9) * .14, Math.cos(x) * .08], i * 3);
    seeds[i] = ((i * 127) % 997) / 997;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('staff', new BufferAttribute(staff, 3));
  geometry.setAttribute('seed', new BufferAttribute(seeds, 1));
  geometry.setAttribute('galaxy', new BufferAttribute(galaxyField(count), GALAXY_STRIDE));
  const atlas = document.createElement('canvas'); atlas.width = 128; atlas.height = 32;
  const ctx = atlas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff'; ctx.font = '26px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ['·', '−', '~', '+'].forEach((glyph, i) => ctx.fillText(glyph, i * 32 + 16, 16));
  }
  const texture = new CanvasTexture(atlas);
  const uniforms = {
    uArrival: { value: options.arrival ? 0 : 1 }, uProgress: { value: 0 },
    uPointer: { value: new Vector2(5, 5) }, uDpr: { value: renderer.getPixelRatio() }, uAtlas: { value: texture },
    uGalaxy: { value: options.galaxy ? 1 : 0 }, uGather: { value: 0 }, uSpin: { value: 0 }, uRelease: { value: 0 },
  };
  const material = new ShaderMaterial({ transparent: true, depthWrite: false, uniforms,
    vertexShader: `
      attribute vec3 staff;
      attribute vec4 galaxy;
      attribute float seed;
      uniform float uArrival;
      uniform float uProgress;
      uniform float uDpr;
      uniform float uGalaxy;
      uniform float uGather;
      uniform float uSpin;
      uniform float uRelease;
      uniform vec2 uPointer;
      varying float vLight;
      varying float vSeed;
      varying float vAlpha;
      vec3 disk(vec3 q) {
        float cs = cos(uSpin), ss = sin(uSpin);
        q = vec3(cs * q.x - ss * q.z, q.y, ss * q.x + cs * q.z);
        float ct = cos(${GALAXY_TILT.toFixed(4)}), st = sin(${GALAXY_TILT.toFixed(4)});
        q = vec3(q.x, ct * q.y - st * q.z, st * q.y + ct * q.z);
        float cw = cos(${GALAXY_TWIST.toFixed(4)}), sw = sin(${GALAXY_TWIST.toFixed(4)});
        return vec3(cw * q.x - sw * q.y, sw * q.x + cw * q.y, q.z);
      }
      void main() {
        float spread = smoothstep(.2, .8, uProgress);
        float hold = 1. - smoothstep(.015, .2, uRelease);
        float g = smoothstep(0., 1., clamp(uGalaxy * 1.3 - seed * .3, 0., 1.)) * hold;
        vec3 p = position;
        vec3 grid = vec3(floor(p.xy * 11.) / 11., 0.);
        p = mix(grid, p, smoothstep(0., 1., uArrival));
        vec3 star = disk(galaxy.xyz);
        p = mix(p, star, g) * (1. - uGather * hold);
        p *= 1. + sin(min(uProgress, .2) * 7.85) * .06;
        p = mix(p, staff, spread);
        vec2 delta = p.xy - uPointer;
        float influence = exp(-dot(delta, delta) * 5.) * (1. - spread);
        p.xy += delta * influence * .16;
        p.z += influence * .13;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.4 + seed * 3.4) * mix(1., .55 + galaxy.w * .6, g) * uDpr * (4. / -mv.z);
        float moon = .24 + .76 * max(0., dot(normalize(position), normalize(vec3(-.6,.7,1.))));
        vLight = mix(mix(moon, galaxy.w, g), .75, spread);
        vSeed = seed;
        vAlpha = (1. - smoothstep(.8, 1., uProgress)) * (.55 + .45 * uArrival) * mix(1., .62 + .38 * clamp(star.z * .6 + .5, 0., 1.), g);
      }
    `,
    fragmentShader: `
      uniform sampler2D uAtlas;
      varying float vLight;
      varying float vSeed;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - .5);
        float dotAlpha = 1. - smoothstep(.16, .5, d);
        vec2 uv = vec2((gl_PointCoord.x + floor(vSeed * 4.)) / 4., gl_PointCoord.y);
        float glyph = texture2D(uAtlas, uv).a;
        float shape = mix(dotAlpha, glyph, step(.88, vSeed));
        gl_FragColor = vec4(vec3(1., .975, .925) * vLight, shape * vAlpha);
      }
    `,
  });
  const points = new Points(geometry, material); scene.add(points);
  let disposed = false, paused = false, frame = 0, active = 0, last = 0, samples = 0, slow = 0, degraded = false, ready = false;
  let target = options.galaxy ? 1 : 0, morph = target, from = target, gather = 0, gatherFrom = 0, elapsed = 0, span = 0;
  const advance = (dt: number) => {
    if (elapsed < span) {
      elapsed = Math.min(span, elapsed + dt);
      const t = elapsed / span, distance = Math.abs(target - from);
      morph = from + (target - from) * ease(Math.max(0, (t - UNFOLD_DELAY) / (1 - UNFOLD_DELAY)));
      gather = Math.max(gatherFrom * (1 - Math.min(1, t / .2)), .11 * distance * Math.sin(Math.PI * Math.min(1, t / GATHER_SPAN)));
      if (elapsed === span) { morph = target; gather = 0; }
    }
    uniforms.uGalaxy.value = morph; uniforms.uGather.value = gather;
    uniforms.uSpin.value = (uniforms.uSpin.value + dt / 1000 * GALAXY_SPIN * morph) % (Math.PI * 2);
  };
  const pointer = new Vector2(5, 5), rotation = new Vector2();
  const resize = () => {
    if (disposed) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
  };
  const fallback = () => { cancelAnimationFrame(frame); paused = true; options.onFallback(); };
  const render = (time: number) => {
    if (disposed || paused) return;
    const dt = last ? Math.min(64, Math.max(0, time - last)) : 0;
    active += dt; advance(dt);
    uniforms.uArrival.value = options.arrival ? Math.min(1, active / (options.mobile ? 800 : 1800)) : 1;
    uniforms.uPointer.value.lerp(pointer, .065);
    points.rotation.x += (rotation.x - points.rotation.x) * .06;
    points.rotation.y += (rotation.y - points.rotation.y) * .06;
    try { renderer.render(scene, camera); } catch { fallback(); return; }
    if (disposed || paused) return;
    if (!ready) { ready = true; options.onReady(); }
    if (last && active > 2200) {
      samples++; if (time - last > 42) slow++;
      if (samples >= 120) {
        if (slow > 75) {
          if (degraded) { fallback(); return; }
          degraded = true; geometry.setDrawRange(0, Math.floor(count * .55));
          renderer.setPixelRatio(.75); uniforms.uDpr.value = .75; resize(); host.dataset.quality = 'low';
        }
        samples = 0; slow = 0;
      }
    }
    last = time; frame = requestAnimationFrame(render);
  };
  const move = (e: PointerEvent) => {
    if (options.mobile || e.pointerType !== 'mouse') return;
    const rect = host.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 2 - 1, y = (e.clientY - rect.top) / rect.height * 2 - 1;
    pointer.set(x * 2.1, -y * 1.7); rotation.set(y * .07, x * .07);
  };
  const leave = () => { pointer.set(5, 5); rotation.set(0, 0); };
  const lost = (e: Event) => { e.preventDefault(); fallback(); };
  renderer.debug.onShaderError = () => fallback();
  const surface = options.surface ?? host;
  surface.addEventListener('pointermove', move); surface.addEventListener('pointerleave', leave);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  resize(); frame = requestAnimationFrame(render);
  return {
    resize,
    scroll: (progress, release = progress) => {
      uniforms.uProgress.value = Math.max(0, Math.min(1, progress)); uniforms.uRelease.value = Math.max(0, Math.min(1, release));
    },
    galaxy: open => {
      const next = open ? 1 : 0;
      if (disposed || next === target) return;
      target = next; from = morph; gatherFrom = gather; elapsed = 0;
      span = Math.max(320, TRANSFORM_MS * Math.abs(target - from));
    },
    pause: value => {
      if (disposed || value === paused) return;
      paused = value; cancelAnimationFrame(frame); last = 0;
      if (!paused) frame = requestAnimationFrame(render);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(frame);
      surface.removeEventListener('pointermove', move); surface.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      geometry.dispose(); material.dispose(); texture.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}

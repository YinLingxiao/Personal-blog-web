import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, require, globals) {
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require, ...globals });
  return exports;
}
function policyEnvironment({ system = false, storageFails = false } = {}) {
  const events = new EventTarget();
  const storage = new Map();
  const media = new Map();
  const effects = [];
  const window = {
    matchMedia(query) {
      if (!media.has(query)) media.set(query, Object.assign(new EventTarget(), { matches: query.includes('reduced-motion') ? system : true }));
      return media.get(query);
    },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events),
  };
  const localStorage = {
    getItem: key => { if (storageFails) throw Error('blocked'); return storage.get(key); },
    setItem: (key, value) => { if (storageFails) throw Error('blocked'); storage.set(key, value); },
  };
  const document = { documentElement: { dataset: {} } };
  const module = load('../src/components/motion/motion.ts', () => ({
    useEffect: fn => effects.push(fn), useSyncExternalStore: (_, snapshot) => snapshot(),
  }), { window, localStorage, document, Event });
  return { module, window, document, effects, storage };
}
test('voluntary preference persists and system preference cannot be overridden', () => {
  const { module, storage } = policyEnvironment({ system: true });
  module.setReducedMotion(false);
  assert.equal(module.useMotionPolicy().reduced, true);
  assert.equal(module.useMotionPolicy().quality, 'static');
  assert.equal(storage.get('moqian-reduced-motion'), 'false');
});
test('blocked storage still permits an in-memory reduced-motion toggle', () => {
  const { module } = policyEnvironment({ storageFails: true });
  assert.equal(module.useMotionPolicy().quality, 'desktop');
  module.setReducedMotion(true);
  assert.equal(module.useMotionPolicy().reduced, true);
  module.setReducedMotion(false);
  assert.equal(module.useMotionPolicy().reduced, false);
});
test('motion root publishes and cleans up its applied policy', () => {
  const { module, document, effects } = policyEnvironment();
  module.setReducedMotion(true); module.useMotionRoot();
  const cleanup = effects[0]();
  assert.equal(document.documentElement.dataset.motion, 'reduced');
  cleanup(); assert.equal(document.documentElement.dataset.motion, undefined);
});
function sceneEnvironment(mobile = false, arrival = true, extra = {}) {
  const frames = new Map(); let nextFrame = 0, clock = 0, ready = 0, fallback = 0;
  const records = { geometries: [], materials: [], textures: [], renderers: [], renders: 0, sizes: 0 };
  class Disposable { dispose() { this.disposed = true; } }
  class Geometry extends Disposable {
    constructor() { super(); this.attributes = {}; records.geometries.push(this); }
    setAttribute(key, value) { this.attributes[key] = value; }
    setDrawRange(start, count) { this.drawRange = { start, count }; }
  }
  class Material extends Disposable { constructor(options) { super(); Object.assign(this, options); records.materials.push(this); } }
  class Texture extends Disposable { constructor() { super(); records.textures.push(this); } }
  class Renderer extends Disposable {
    constructor() { super(); this.domElement = Object.assign(new EventTarget(), { setAttribute() {}, remove() {} }); this.debug = {}; records.renderers.push(this); }
    setClearColor() {} setPixelRatio(value) { this.dpr = value; } getPixelRatio() { return this.dpr; } setSize() { records.sizes++; }
    render() { records.renders++; } forceContextLoss() { this.lost = true; }
  }
  class Vector { constructor(x = 0, y = 0) { this.x = x; this.y = y; } set(x, y) { this.x = x; this.y = y; } lerp() {} }
  const three = {
    BufferGeometry: Geometry, BufferAttribute: class { constructor(array) { this.array = array; } }, ShaderMaterial: Material,
    CanvasTexture: Texture, WebGLRenderer: Renderer, Vector2: Vector, Color: class {}, Scene: class { add() {} },
    PerspectiveCamera: class { position = {}; updateProjectionMatrix() {} }, Points: class { rotation = { x: 0, y: 0 }; },
  };
  const host = Object.assign(new EventTarget(), { dataset: {}, appendChild() {}, getBoundingClientRect: () => ({ width: 700, height: 600, left: 0, top: 0 }) });
  const galaxy = load('../src/graphics/galaxyField.ts', () => ({}), {});
  const score = load('../src/graphics/scoreField.ts', () => ({}), {});
  const { createMoon } = load('../src/graphics/livingMoon.ts', name => name === './galaxyField' ? galaxy : name === './scoreField' ? score : three, {
    devicePixelRatio: 3,
    document: { createElement: () => ({ getContext: () => ({ fillText() {} }) }) },
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; }, cancelAnimationFrame: id => frames.delete(id),
  });
  let scene;
  scene = createMoon(host, { mobile, arrival, ...extra, onReady: () => ready++, onFallback: () => { fallback++; scene.dispose(); } });
  const step = (ms = 16) => { clock += ms; const current = [...frames.values()]; frames.clear(); current.forEach(fn => fn(clock)); };
  const uniforms = () => records.materials[0].uniforms;
  return { scene, records, frames, step, host, uniforms, counts: () => ({ ready, fallback }) };
}
test('desktop scene caps particles and DPR, pauses, resumes and disposes without leaked frames', () => {
  const { scene, records, step, frames, counts } = sceneEnvironment();
  assert.equal(records.geometries[0].attributes.position.array.length, 2400 * 3);
  assert.equal(records.renderers[0].dpr, 1.5);
  step(); assert.equal(counts().ready, 1);
  scene.pause(true); const renders = records.renders; step(); assert.equal(records.renders, renders);
  scene.pause(false); scene.pause(false); assert.equal(frames.size, 1); step();
  scene.scroll(.6); assert.equal(records.materials[0].uniforms.uProgress.value, .6);
  scene.dispose(); scene.dispose(); assert.equal(frames.size, 0);
  assert.ok([...records.geometries, ...records.materials, ...records.textures, ...records.renderers].every(x => x.disposed));
});
test('mobile scene is lighter and a subsequent arrival starts settled', () => {
  const { scene, records, step } = sceneEnvironment(true, false);
  assert.equal(records.geometries[0].attributes.position.array.length, 800 * 3);
  assert.equal(records.renderers[0].dpr, 1); step();
  assert.equal(records.materials[0].uniforms.uArrival.value, 1); scene.dispose();
});

test('score transition field remains bounded at mobile and degraded particle budgets', () => {
  const { scoreField } = load('../src/graphics/scoreField.ts', () => ({}), {});
  const full = scoreField(2400);
  assert.deepEqual([...scoreField(800)], [...full.subarray(0, 2400)]);
  for (const count of [800, 1320, 2400]) {
    for (let i = 0; i < count; i++) {
      const [x, y, z] = full.subarray(i * 3, i * 3 + 3);
      assert.ok(Number.isFinite(x + y + z));
      assert.ok(Math.abs(x) <= 3.3 && Math.abs(y) < 1.2);
    }
  }
});

test('score holds an empty staff before symbols rise and reverses without a timer', () => {
  const { scoreProgress } = load('../src/graphics/scoreProgress.ts', () => ({}), {});
  const drawing = scoreProgress(.33);
  assert.ok(drawing.staff > 0 && drawing.staff < 1);
  for (const t of [.45, .5, .57]) {
    const state = scoreProgress(t);
    assert.equal(state.staff, 1);
    assert.equal(state.clef, 0);
    assert.equal(state.clefMotion.opacity, 0);
    assert.ok(state.notes.every(n => n === 0));
  }
  const clefRising = scoreProgress(.63);
  assert.ok(clefRising.clef > 0 && clefRising.clef < 1);
  assert.ok(clefRising.clefMotion.offset > 0 && clefRising.clefMotion.offset < 34);
  assert.ok(clefRising.notes.every(n => n === 0));
  const rising = scoreProgress(.74);
  assert.equal(rising.clef, 1);
  assert.equal(rising.clefMotion.offset, 0);
  assert.ok(rising.notes[0] > rising.notes[1]);
  assert.equal(rising.notes[1], rising.notes[2]);
  assert.ok(rising.noteMotion[0].stem > 0 && rising.noteMotion[0].stem < 1);
  const settled = scoreProgress(.96);
  assert.ok(settled.notes.every(n => n === 1));
  assert.ok(settled.noteMotion.every(m => m.opacity === 1 && m.offset === 0 && m.stem === 1));
  assert.equal(settled.fade, 1);
  assert.equal(scoreProgress(1).fade, 0);
  assert.deepEqual(scoreProgress(.74), rising);
});

test('sustained slow frames downgrade once and then retain the static fallback', () => {
  const { scene, records, step, frames, host, counts } = sceneEnvironment();
  for (let i = 0; i < 180; i++) step(60);
  assert.equal(host.dataset.quality, 'low');
  assert.equal(records.renderers[0].dpr, .75);
  assert.equal(records.geometries[0].drawRange.count, 1320);
  for (let i = 0; i < 130; i++) step(60);
  assert.equal(counts().fallback, 1); assert.equal(frames.size, 0);
  scene.pause(false); assert.equal(frames.size, 0);
});
test('lost graphics context restores the fallback and releases resources', () => {
  const { scene, records, step, frames, counts } = sceneEnvironment(); step();
  records.renderers[0].domElement.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  assert.equal(counts().fallback, 1); assert.equal(frames.size, 0); assert.ok(records.geometries[0].disposed);
  const sizes = records.sizes; scene.resize(); assert.equal(records.sizes, sizes);
});
test('galaxy field is deterministic, bounded and shared by both particle budgets', () => {
  const { galaxyField, GALAXY_STRIDE } = load('../src/graphics/galaxyField.ts', () => ({}), {});
  const a = galaxyField(2400), b = galaxyField(2400);
  assert.deepEqual([...a], [...b]);
  assert.deepEqual([...galaxyField(800)], [...a.subarray(0, 800 * GALAXY_STRIDE)]);
  for (let i = 0; i < 2400; i++) {
    const [x, y, z, light] = a.subarray(i * GALAXY_STRIDE, i * GALAXY_STRIDE + GALAXY_STRIDE);
    assert.ok(Math.hypot(x, z) < 2.1 && Math.abs(y) < .6 && light > 0 && light <= 1);
  }
});
test('opening the galaxy gathers inward first, then unfolds within the transformation window', () => {
  const { scene, step, uniforms } = sceneEnvironment(false, false);
  step(); scene.galaxy(true);
  let settled = 0, peak = 0, gatheredBeforeUnfold = false;
  for (let t = 16; t <= 1200; t += 16) {
    step();
    peak = Math.max(peak, uniforms().uGather.value);
    if (uniforms().uGather.value > .02 && uniforms().uGalaxy.value < .02) gatheredBeforeUnfold = true;
    if (!settled && uniforms().uGalaxy.value === 1 && uniforms().uGather.value === 0) settled = t;
  }
  assert.ok(gatheredBeforeUnfold);
  assert.ok(peak > .05 && peak < .15);
  assert.ok(settled >= 650 && settled <= 850, `settled at ${settled}ms`);
  const spin = uniforms().uSpin.value; step(1000 / 60 * 60);
  assert.ok(uniforms().uSpin.value > spin && uniforms().uSpin.value - spin < .01);
  scene.dispose();
});
test('retargeting mid-transformation continues from the current shape and resolves to the latest mode', () => {
  const { scene, step, uniforms } = sceneEnvironment(false, false);
  step(); scene.galaxy(true);
  for (let i = 0; i < 25; i++) step();
  const mid = uniforms().uGalaxy.value;
  assert.ok(mid > .2 && mid < 1);
  scene.galaxy(false); scene.galaxy(true); scene.galaxy(false); step();
  assert.ok(Math.abs(uniforms().uGalaxy.value - mid) < .08);
  let frames = 0;
  while (uniforms().uGalaxy.value > 0 && frames < 100) { step(); frames++; }
  assert.equal(uniforms().uGalaxy.value, 0);
  assert.ok(frames * 16 <= 800);
  for (let i = 0; i < 10; i++) step();
  assert.equal(uniforms().uGather.value, 0);
  scene.dispose();
});
test('hidden time is not replayed when rendering resumes', () => {
  const { scene, step, uniforms } = sceneEnvironment(false, false);
  step(); scene.galaxy(true); for (let i = 0; i < 16; i++) step();
  const before = { galaxy: uniforms().uGalaxy.value, spin: uniforms().uSpin.value };
  scene.pause(true); step(60000); scene.pause(false); step(16);
  assert.equal(uniforms().uGalaxy.value, before.galaxy);
  assert.equal(uniforms().uSpin.value, before.spin);
  step(16); assert.ok(uniforms().uGalaxy.value > before.galaxy);
  scene.dispose();
});
test('a galaxy chosen before the renderer exists is honored without replaying the transformation', () => {
  const { scene, step, uniforms } = sceneEnvironment(true, false, { galaxy: true });
  assert.equal(uniforms().uGalaxy.value, 1);
  step(); assert.equal(uniforms().uGalaxy.value, 1); assert.equal(uniforms().uGather.value, 0);
  scene.galaxy(true); step(); assert.equal(uniforms().uGather.value, 0);
  scene.scroll(.1, .1); assert.equal(uniforms().uRelease.value, .1);
  scene.scroll(.02); assert.equal(uniforms().uRelease.value, .02);
  scene.scroll(.2, 0); assert.equal(uniforms().uRelease.value, 0); assert.equal(uniforms().uProgress.value, .2);
  scene.dispose();
});
test('pointer response follows the stationary surface and is released on dispose', () => {
  const surface = new EventTarget(); const added = [], removed = [];
  surface.addEventListener = type => added.push(type); surface.removeEventListener = type => removed.push(type);
  const { scene } = sceneEnvironment(false, false, { surface });
  assert.deepEqual(added.sort(), ['pointerleave', 'pointermove']);
  scene.dispose(); assert.deepEqual(removed.sort(), ['pointerleave', 'pointermove']);
});

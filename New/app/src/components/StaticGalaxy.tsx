import { memo } from 'react';
import { GALAXY_STRIDE, galaxyField, projectGalaxy } from '@/graphics/galaxyField';

const LAYERS = [
  { min: 0, width: .02, opacity: .34 },
  { min: .3, width: .026, opacity: .52 },
  { min: .5, width: .032, opacity: .74 },
  { min: .72, width: .038, opacity: .95 },
];
let cached: string[] | undefined;
function layers() {
  if (cached) return cached;
  const count = 620, field = galaxyField(count), paths = LAYERS.map(() => '');
  for (let i = 0; i < count; i++) {
    const [x, y, z, light] = field.subarray(i * GALAXY_STRIDE, i * GALAXY_STRIDE + GALAXY_STRIDE);
    const star = projectGalaxy(x, y, z);
    const layer = LAYERS.reduce((found, entry, index) => light >= entry.min ? index : found, 0);
    paths[layer] += `M${star.x.toFixed(3)} ${(-star.y).toFixed(3)}h0`;
  }
  cached = paths;
  return paths;
}

function StaticGalaxy({ className }: { className?: string }) {
  const paths = layers();
  return <svg className={className} viewBox="-1.95 -1.95 3.9 3.9" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="static-galaxy-core">
        <stop offset="0" stopColor="#fff6e6" stopOpacity=".32" />
        <stop offset="1" stopColor="#fff6e6" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse rx=".42" ry=".24" fill="url(#static-galaxy-core)" transform="rotate(18)" />
    {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="#f6efe2" strokeLinecap="round" strokeWidth={LAYERS[i].width} strokeOpacity={LAYERS[i].opacity} />)}
  </svg>;
}

export default memo(StaticGalaxy);

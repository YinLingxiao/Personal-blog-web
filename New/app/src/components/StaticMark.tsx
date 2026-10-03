import { memo } from 'react';
import { markField } from '@/graphics/markField';

let cached: string[] | undefined;
function paths() {
  if (cached) return cached;
  const field = markField(1700);
  const groups = ['', '', ''];
  for (let i = 0; i < field.length; i += 4) {
    const part = Math.round(field[i + 3]);
    groups[part] += `M${(field[i] * 100).toFixed(2)} ${(-field[i + 1] * 100).toFixed(2)}h0`;
  }
  cached = groups;
  return groups;
}

function StaticMark({ className }: { className?: string }) {
  return <svg className={className} viewBox="-330 -270 660 540" aria-hidden="true" focusable="false">
    {paths().map((d, index) => <path key={index} d={d} fill="none" stroke="#f4efe4" strokeWidth={index === 1 ? 1.65 : 1.4} strokeLinecap="round" strokeOpacity=".82" />)}
  </svg>;
}

export default memo(StaticMark);

import { useId } from 'react';
import { BRAND_MARK } from '@/components/brand/brandMarkPaths';
import { MARK_CENTER, MARK_SCALE } from '@/graphics/markField';

// 内层 svg 沿用 BrandMark 的 0 0 100 144 视框，transform-origin 与页眉动效一致；位置与粒子坐标对齐
const width = BRAND_MARK.width * MARK_SCALE, height = BRAND_MARK.height * MARK_SCALE;
const x = 330 - MARK_CENTER[0] * MARK_SCALE, y = 270 - MARK_CENTER[1] * MARK_SCALE;

export default function LunarMark() {
  const id = useId().replace(/:/g, '');
  return <svg className="lunar-mark" viewBox="0 0 660 540" aria-hidden="true">
    <svg x={x} y={y} width={width} height={height} viewBox={`0 0 ${BRAND_MARK.width} ${BRAND_MARK.height}`} overflow="visible">
      <defs>
        <linearGradient id={`${id}-glint`}><stop stopColor="#f6f2e8" stopOpacity="0"/><stop offset=".5" stopColor="#f6f2e8" stopOpacity=".7"/><stop offset="1" stopColor="#f6f2e8" stopOpacity="0"/></linearGradient>
        <mask id={`${id}-ink`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="184">
          {[BRAND_MARK.ray, BRAND_MARK.star, BRAND_MARK.moon].map(d => <path key={d} d={d} fill="#fff"/>)}
        </mask>
      </defs>
      <g fill="#e9e6df">
        <path className="lunar-mark-ray" d={BRAND_MARK.ray}/>
        <path className="lunar-mark-star" d={BRAND_MARK.star}/>
        <path className="lunar-mark-moon" d={BRAND_MARK.moon}/>
      </g>
      <g mask={`url(#${id}-ink)`}>
        <g transform="rotate(14 50 72)">
          <rect className="lunar-mark-glint" x="-40" y="-20" width="32" height="184" fill={`url(#${id}-glint)`}/>
        </g>
      </g>
    </svg>
  </svg>;
}

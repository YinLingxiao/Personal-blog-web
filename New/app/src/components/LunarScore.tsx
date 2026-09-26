import { useId } from 'react';

const CLEF = 'M602 978 659 695Q668 696 677.0 696.0Q686 696 694 696Q772 696 838.0 665.5Q904 635 952.0 584.5Q1000 534 1026.5 468.5Q1053 403 1053 333Q1053 276 1035.5 223.5Q1018 171 984.5 127.5Q951 84 903.0 51.5Q855 19 794 3L828 -174Q830 -188 831.5 -200.5Q833 -213 833 -227Q833 -279 814.5 -325.0Q796 -371 763.5 -406.0Q731 -441 688.0 -461.5Q645 -482 596 -482Q551 -482 508.0 -468.5Q465 -455 431.5 -430.5Q398 -406 377.5 -370.0Q357 -334 357 -289Q357 -246 381.5 -212.5Q406 -179 462 -171Q467 -170 472.5 -169.5Q478 -169 483 -169Q511 -169 534.0 -180.5Q557 -192 573.5 -211.0Q590 -230 598.5 -253.5Q607 -277 607 -302Q607 -335 590.0 -366.0Q573 -397 536 -414Q550 -419 563.0 -420.5Q576 -422 590 -422Q628 -422 658.5 -406.5Q689 -391 710.0 -365.0Q731 -339 742.5 -303.5Q754 -268 754 -227Q754 -215 751.5 -194.0Q749 -173 747 -161L718 -11Q691 -18 647 -18Q548 -18 451.5 3.0Q355 24 277.5 75.0Q200 126 149.0 210.5Q98 295 91 422Q90 432 90.0 442.0Q90 452 90 462Q90 556 116.0 646.5Q142 737 199 815Q265 901 342.0 962.0Q419 1023 513 1073Q498 1149 487.5 1204.0Q477 1259 470.0 1297.5Q463 1336 459.0 1361.0Q455 1386 452.5 1402.0Q450 1418 449.5 1428.0Q449 1438 449 1447Q449 1485 460.0 1519.5Q471 1554 492.0 1580.5Q513 1607 543.5 1623.0Q574 1639 613 1639Q661 1639 698.0 1616.5Q735 1594 759.5 1559.0Q784 1524 796.5 1481.0Q809 1438 809 1397Q809 1338 790.5 1280.0Q772 1222 742.5 1168.0Q713 1114 676.0 1065.5Q639 1017 602 978ZM629 1485Q597 1485 578.5 1471.5Q560 1458 550.5 1440.0Q541 1422 538.5 1403.5Q536 1385 536 1375Q536 1302 550.0 1238.0Q564 1174 575 1113Q613 1135 641.5 1164.5Q670 1194 689.0 1227.0Q708 1260 717.5 1294.0Q727 1328 727 1358Q727 1380 722.5 1403.0Q718 1426 707.0 1444.0Q696 1462 677.0 1473.5Q658 1485 629 1485ZM705 55 619 513Q581 504 552.5 482.5Q524 461 505.0 431.5Q486 402 476.5 367.5Q467 333 467 298Q467 285 468.5 272.0Q470 259 472 247Q425 269 401.0 309.0Q377 349 377 398Q377 447 394.0 491.0Q411 535 440.5 571.0Q470 607 508.5 634.0Q547 661 590 677Q579 735 569 785L543 918Q473 852 404.0 786.5Q335 721 271 646Q250 621 230.0 594.0Q210 567 195.0 537.5Q180 508 171.0 476.5Q162 445 162 411Q163 341 184.5 287.5Q206 234 242.0 193.5Q278 153 325.5 125.5Q373 98 425.0 81.0Q477 64 530.5 56.5Q584 49 632 49Q669 49 705 55ZM691 520 779 75Q824 87 858.0 112.5Q892 138 914.5 171.0Q937 204 948.0 241.5Q959 279 959 316Q959 374 935.5 413.0Q912 452 874.0 476.0Q836 500 788.0 510.0Q740 520 691 520Z';
const NOTES = [{ x: 208, y: 290 }, { x: 290, y: 260 }, { x: 372, y: 250 }, { x: 464, y: 280 }, { x: 560, y: 270 }];

export default function LunarScore() {
  const id = useId().replace(/:/g, '');
  return <svg className="lunar-score" viewBox="0 0 660 540" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-staff`} gradientUnits="userSpaceOnUse" x1="4" y1="0" x2="656" y2="0"><stop stopColor="#e7e3d9" stopOpacity="0"/><stop offset=".12" stopColor="#e7e3d9" stopOpacity=".56"/><stop offset=".88" stopColor="#e7e3d9" stopOpacity=".56"/><stop offset="1" stopColor="#e7e3d9" stopOpacity="0"/></linearGradient>
      <linearGradient id={`${id}-glint`}><stop stopColor="#f0ece0" stopOpacity="0"/><stop offset=".5" stopColor="#f0ece0" stopOpacity=".55"/><stop offset="1" stopColor="#f0ece0" stopOpacity="0"/></linearGradient>
      <mask id={`${id}-clef-ink`} maskUnits="userSpaceOnUse">
        <path d={CLEF} transform="translate(58 316) scale(.078 -.078)" fill="#fff" stroke="#000" strokeWidth="52" strokeLinejoin="round"/>
      </mask>
    </defs>
    <g transform="rotate(-10 330 270)">
      <g className="lunar-score-staff" stroke={`url(#${id}-staff)`} strokeWidth=".95">
        {[230, 250, 270, 290, 310].map(y => <path key={y} d={`M4 ${y}H656`} pathLength={1}/>)}
      </g>
      <g className="lunar-score-clef" mask={`url(#${id}-clef-ink)`}>
        <path d={CLEF} transform="translate(58 316) scale(.078 -.078)" fill="#dcd7ca"/>
        <rect className="lunar-score-glint" x="20" y="180" width="45" height="200" fill={`url(#${id}-glint)`}/>
      </g>
      {NOTES.map(({ x, y }, i) => <g key={x} className="lunar-score-note" fill="#dcd7ca" stroke="#c7c0af"
        style={{ opacity: `var(--score-note-${i}, 0)`, transform: `translateY(var(--score-note-rise-${i}, 26px))` }}>
        <ellipse cx={x} cy={y} rx="10.8" ry="6.6" transform={`rotate(-26 ${x} ${y})`} fill={i === 4 ? 'none' : undefined} strokeWidth={i === 4 ? 1.6 : .8}/>
        <path className="lunar-score-stem" d={`M${x + 9.4} ${y - 1}V${y - 70}`} pathLength={1} fill="none" stroke="#dcd7ca" strokeWidth="1.1"
          style={{ strokeDashoffset: `calc(1 - var(--score-stem-${i}, 0))` }}/>
        {i === 2 && <path d="M299.4 190 381.4 180V186L299.4 196Z" stroke="none" style={{ opacity: 'var(--score-stem-2, 0)' }}/>}
      </g>)}
    </g>
  </svg>;
}



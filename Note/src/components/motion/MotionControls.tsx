import { setReducedMotion, useMotionPolicy } from './motion';
import './motion.css';

export default function MotionControls() {
  const { requested, reduced, system } = useMotionPolicy();
  return <button className="motion-control" type="button" aria-pressed={reduced} disabled={system}
    onClick={() => setReducedMotion(!requested)}>
    <span aria-hidden="true">{reduced ? '○' : '◌'}</span> 减少动效 <span>{system ? '系统已开启' : reduced ? '已开启' : '未开启'}</span>
  </button>;
}

import { memo, useEffect, useRef } from 'react';
import { mountStarfield } from '@/lib/starfield';

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) return mountStarfield(canvas);
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-0 h-full w-full pointer-events-none" />;
};

export default memo(ParticleBackground);

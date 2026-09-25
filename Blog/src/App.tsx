import { useMotionRoot } from '@/components/motion/motion';
import MotionControls from '@/components/motion/MotionControls';
import './living-score.css';
import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import ParticleBackground from '@/components/ParticleBackground';
import CustomCursor from '@/components/motion/CustomCursor';

const BlogHome = lazy(() => import('./pages/BlogHome'));
const ArticleLayout = lazy(() => import('./pages/ArticleLayout'));
const AdminUpload = lazy(() => import('./pages/AdminUpload'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  const { reduced } = useMotionRoot();
  const { pathname } = useLocation();
  return (
    <div className="relative isolate min-h-screen">
      {!reduced && <div className="blog-atmosphere" data-reading={pathname.startsWith('/post/')}><ParticleBackground /></div>}
      <div className="relative z-10">
      <CustomCursor />
      <Suspense fallback={null}>
        <div key={pathname} className="blog-route-entry"><Routes>
          <Route path="/" element={<BlogHome />} />
          <Route path="/post/:id" element={<ArticleLayout />} />
          <Route path="/admin/upload" element={<AdminUpload />} />
          <Route path="*" element={<NotFound />} />
        </Routes></div>
      </Suspense>
      <div className="blog-motion-footer"><MotionControls /></div>
      </div>
    </div>
  );
}

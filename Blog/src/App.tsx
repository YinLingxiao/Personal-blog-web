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
const AdminPosts = lazy(() => import('./pages/AdminPosts'));
const AdminEditPost = lazy(() => import('./pages/AdminEditPost'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ArenaDemo = lazy(() => import('./pages/ArenaDemo'));

export default function App() {
  const { reduced } = useMotionRoot();
  const { pathname } = useLocation();
  const isArenaDemo = pathname === '/demo/arena' || pathname.startsWith('/demo/arena/');
  const isEditorialIndex = pathname === '/' || isArenaDemo;
  return (
    <div className="relative isolate min-h-screen">
      {!reduced && !isEditorialIndex && <div className="blog-atmosphere" data-reading={pathname.startsWith('/post/')}><ParticleBackground /></div>}
      <div className="relative z-10">
      {!isEditorialIndex && <CustomCursor />}
      <Suspense fallback={null}>
        <div key={pathname} className="blog-route-entry"><Routes>
          <Route path="/" element={<BlogHome />} />
          <Route path="/demo/arena" element={<ArenaDemo />} />
          <Route path="/demo/arena/:id" element={<ArenaDemo />} />
          <Route path="/post/:id" element={<ArticleLayout />} />
          <Route path="/admin/upload" element={<AdminUpload />} />
          <Route path="/admin/posts" element={<AdminPosts />} />
          <Route path="/admin/posts/:slug/edit" element={<AdminEditPost />} />
          <Route path="*" element={<NotFound />} />
        </Routes></div>
      </Suspense>
      {!isEditorialIndex && <div className="blog-motion-footer"><MotionControls /></div>}
      </div>
    </div>
  );
}

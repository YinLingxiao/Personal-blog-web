import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import CustomCursor from '@/components/CustomCursor';

const BlogHome = lazy(() => import('./pages/BlogHome'));
const ArticleLayout = lazy(() => import('./pages/ArticleLayout'));

export default function App() {
  return (
    <>
      <CustomCursor />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<BlogHome />} />
          <Route path="/post/:id" element={<ArticleLayout />} />
        </Routes>
      </Suspense>
    </>
  );
}

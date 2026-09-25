import { useMotionRoot } from '@/components/motion/motion';
import './living-score.css';
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import NoteLayout from './pages/NoteLayout';
import LandingRedirect from '@/components/LandingRedirect';
import CustomCursor from '@/components/motion/CustomCursor';

const AdminUpload = lazy(() => import('./pages/AdminUpload'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  useMotionRoot();
  return (
    <>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/post/:id" element={<NoteLayout />} />
        <Route path="/graph" element={<NoteLayout />} />
        <Route path="/admin/upload" element={<Suspense fallback={null}><AdminUpload /></Suspense>} />
        <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
      </Routes>
    </>
  );
}

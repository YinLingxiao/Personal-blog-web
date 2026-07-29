import { Routes, Route } from 'react-router';
import NoteLayout from './pages/NoteLayout';
import LandingRedirect from '@/components/LandingRedirect';
import CustomCursor from '@/components/CustomCursor';

export default function App() {
  return (
    <>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/post/:id" element={<NoteLayout />} />
        <Route path="/graph" element={<NoteLayout />} />
      </Routes>
    </>
  );
}

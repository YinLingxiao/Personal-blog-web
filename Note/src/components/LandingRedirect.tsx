import { Navigate } from 'react-router';
import { useNotes } from '@/hooks/useNotes';
import { useIsMobile } from '@/hooks/useMediaQuery';

/**
 * Landing route ("/") behaviour, split by device:
 *  - desktop → the force-directed graph (脉络), for visual impact
 *  - mobile  → the latest article (editor), since the graph is hard to
 *              touch-operate on a small screen
 * Falls back to /graph when there are no notes to land on.
 */
export default function LandingRedirect() {
  const isMobile = useIsMobile();
  const { notes } = useNotes();

  if (!isMobile) return <Navigate to="/graph" replace />;

  const latest = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return <Navigate to={latest ? `/post/${latest.id}` : '/graph'} replace />;
}

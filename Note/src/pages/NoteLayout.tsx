import { useMotionPolicy } from '@/components/motion/motion';
import MotionControls from '@/components/motion/MotionControls';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link, useParams, useNavigate, useLocation, useSearchParams } from 'react-router';
import { buildGraphData, buildCategoryGraph, resolveLink } from '@/utils/linkParser';
import {
  appConfig,
  backgroundConfig,
  headerConfig,
  siteConfig,
} from '@/config';
import Sidebar from '@/components/Sidebar';
import NoteBrandHome from '@/components/NoteBrandHome';
import AuthMenu from '@/components/AuthMenu';
import { useNotes } from '@/hooks/useNotes';
import { useIsMobile } from '@/hooks/useMediaQuery';

const SilkCascade = lazy(() => import('@/components/FlowField'));
const MoonlitRipple = lazy(() => import('@/components/MoonlitRipple'));
const RainOnGlass = lazy(() => import('@/components/RainOnGlass'));
const NoteEditor = lazy(() => import('@/components/NoteEditor'));
const GraphView = lazy(() => import('@/components/GraphView'));

type BgMode = 'solid' | 'silk' | 'moonlit' | 'rain';
const BG_KEY = 'template-03-bg';
const BG_COLOR_KEY = 'template-03-bg-color';

export default function NoteLayout() {
  const { reduced } = useMotionPolicy();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const graphCategory = searchParams.get('cat');
  const { notes } = useNotes();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const selectedId = id ?? null;
  const viewMode = location.pathname.endsWith('/graph') ? 'graph' : 'editor';
  const [search, setSearch] = useState('');
  const [bg, setBg] = useState<BgMode>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(BG_KEY); } catch { void 0; }
    if (saved === 'black') return 'solid';
    return (saved as BgMode) || backgroundConfig.defaultMode;
  });
  const [bgColor, setBgColor] = useState(() => { try { return localStorage.getItem(BG_COLOR_KEY) || backgroundConfig.defaultSolidColor; } catch { return backgroundConfig.defaultSolidColor; } });
  const [showBgMenu, setShowBgMenu] = useState(false);
  useEffect(() => {
    if (!showBgMenu) return;
    const previous = document.activeElement as HTMLElement | null;
    const menu = document.getElementById('note-appearance');
    const buttons = menu?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    buttons?.[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setShowBgMenu(false); }
      if (e.key !== 'Tab' || !buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    menu?.addEventListener('keydown', key);
    return () => { menu?.removeEventListener('keydown', key); previous?.focus(); };
  }, [showBgMenu]);

  useEffect(() => { try { localStorage.setItem(BG_KEY, bg); } catch { void 0; } }, [bg]);
  useEffect(() => { try { localStorage.setItem(BG_COLOR_KEY, bgColor); } catch { void 0; } }, [bgColor]);
  useEffect(() => {
    document.title = siteConfig.title;
    document.documentElement.lang = siteConfig.language;
  }, []);
  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedId) ?? null, [notes, selectedId]);
  const graphData = useMemo(
    () => (graphCategory ? buildGraphData(notes, { category: graphCategory }) : buildCategoryGraph(notes)),
    [notes, graphCategory],
  );

  const handleGraphNodeClick = useCallback((id: string) => {
    if (id.startsWith('cat:')) { setSearchParams({ cat: id.slice(4) }); return; }
    if (id.startsWith('ghost:')) return;
    navigate(`/post/${id}`);
  }, [navigate, setSearchParams]);

  const handleNavigate = useCallback((title: string) => {
    const found = resolveLink(title, notes);
    if (found) {
      navigate(`/post/${found.id}`);
      }
  }, [notes, navigate]);

  const handleSelect = useCallback((noteId: string) => {
    navigate(`/post/${noteId}`);
    setDrawerOpen(false); // collapse the mobile drawer after picking an article
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={bg === 'solid' || reduced ? { backgroundColor: bgColor } : undefined}>
      <div className="note-atmosphere" data-reading={viewMode === 'editor'}><Suspense fallback={null}>
        {!reduced && bg === 'silk' && <SilkCascade />}
        {!reduced && bg === 'moonlit' && <MoonlitRipple />}
        {!reduced && bg === 'rain' && <RainOnGlass />}
      </Suspense></div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <header className="note-toolbar liquid-glass h-11 shrink-0 flex items-center justify-between px-4">
          <div className="relative z-10 flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setDrawerOpen((v) => !v)}
                className="relative z-10 -ml-1 p-2 text-[#888] hover:text-[#ccc] transition-colors"
                aria-label={headerConfig.menuButtonTitle}
                title={headerConfig.menuButtonTitle}
                aria-expanded={drawerOpen}
              >
                &#9776;
              </button>
            )}
            <NoteBrandHome />
            {/* 主页与博文之前只能单向到达笔记，这里补上回博文的一段，让三处互通。 */}
            <a
              href={headerConfig.blogUrl}
              className="font-serif-cn pl-3 text-xs text-[#666] hover:text-[#ccc] transition-colors border-l border-white/[0.06]"
              title={headerConfig.blogButtonTitle}
            >
              {headerConfig.blogButtonLabel}
            </a>
          </div>
          <div className="note-toolbar__actions relative z-10 flex items-center gap-1">
            {(['editor', 'graph'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  if (m === 'graph') navigate('/graph', { state: { noteId: selectedId } });
                  else { const destination = selectedId || location.state?.noteId || notes[0]?.id; if (destination) navigate(`/post/${encodeURIComponent(destination)}`); }
                }}
                aria-pressed={viewMode === m}
                className={`font-serif-cn px-3 py-1.5 text-xs rounded-md transition-colors ${
                  viewMode === m ? 'text-[#e0e0e0] bg-white/[0.06]' : 'text-[#555] hover:text-[#999]'
                }`}
              >
                {m === 'editor' ? headerConfig.editorViewLabel : headerConfig.graphViewLabel}
              </button>
            ))}

            <button
              onClick={() => setShowBgMenu(!showBgMenu)}
              className="ml-1 px-2.5 py-1.5 text-xs text-[#444] hover:text-[#888] transition-colors"
              title={headerConfig.backgroundButtonTitle}
              aria-label={headerConfig.backgroundButtonTitle}
              aria-expanded={showBgMenu}
            >
              &#9680;
            </button>

            <AuthMenu compact />

            <Link
              to="/"
              className="group font-serif-cn ml-2 pl-2.5 px-2.5 py-1.5 text-xs text-[#666] hover:text-[#ccc] transition-colors border-l border-white/[0.06] flex items-center gap-1.5"
              aria-label="返回笔记首页"
            >
              <span className="hidden sm:inline">笔记首页</span>
              <span className="sm:hidden">首页</span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden gap-px">
          <Sidebar
            notes={notes}
            selectedId={selectedId}
            search={search}
            onSearch={setSearch}
            onSelect={handleSelect}
            isMobile={isMobile}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />

          <main className="flex-1 min-w-0 overflow-hidden" inert={isMobile && drawerOpen}>
            <Suspense fallback={null}>
              {viewMode === 'editor' && selectedNote ? (
                <NoteEditor
                  key={selectedNote.id}
                  note={selectedNote}
                  allNotes={notes}
                  onNavigate={handleNavigate}
                />
              ) : viewMode === 'graph' ? (
                <GraphView
                  data={graphData}
                  onNodeClick={handleGraphNodeClick}
                  selectedNodeId={selectedId}
                  scope={graphCategory}
                  onBack={() => setSearchParams({})}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-[#333] text-sm font-serif-cn">{appConfig.emptyStateLabel}</div>
              )}
            </Suspense>
          </main>
        </div>
      </div>

      {showBgMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowBgMenu(false)} />
          <div id="note-appearance" role="dialog" aria-modal="true" aria-label="背景与动效" className="fixed right-4 top-14 z-[60] bg-[#111] border border-white/[0.06] rounded-lg py-1 min-w-[120px] shadow-2xl">
            <div className="note-motion-control"><MotionControls /></div>
            {backgroundConfig.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setBg(opt.id); if (opt.id !== 'solid') setShowBgMenu(false); }}
                className={`font-serif-cn w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  bg === opt.id ? 'text-[#e0e0e0]' : 'text-[#666] hover:text-[#bbb]'
                }`}
              >
                {bg === opt.id && <span className="mr-1.5 text-accent">&#183;</span>}
                {opt.label}
              </button>
            ))}

            {bg === 'solid' && (
              <div className="px-3 py-2 border-t border-white/[0.06] mt-1 flex gap-2">
                {backgroundConfig.solidColors.map((c) => (
                  <button
                    key={c.color}
                    onClick={() => { setBgColor(c.color); setShowBgMenu(false); }}
                    title={c.label}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.color,
                      boxShadow: bgColor === c.color ? '0 0 0 1.5px #888' : 'inset 0 0 0 1px rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ICP filing — required on every page for a mainland-China-hosted site */}
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-2 right-3 z-20 text-[10px] tracking-wider text-[#555] hover:text-[#999] transition-colors font-sans"
      >
        京ICP备2026027832号
      </a>
    </div>
  );
}

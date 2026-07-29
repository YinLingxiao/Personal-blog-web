import type { Note } from '../types';
import { sidebarConfig } from '../config';
import MoonPhase from './MoonPhase';

interface Props {
  notes: Note[];
  selectedId: string | null;
  search: string;
  onSearch: (q: string) => void;
  onSelect: (id: string) => void;
  /** mobile = render as an off-canvas drawer toggled by `open`/`onClose` */
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ notes, selectedId, search, onSearch, onSelect, isMobile = false, open = false, onClose }: Props) {
  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    : notes;
  const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);

  // Desktop: a permanent flex column. Mobile: a fixed slide-in drawer + backdrop.
  const asideClass = isMobile
    ? `liquid-glass fixed inset-y-0 left-0 z-50 w-[78vw] max-w-xs h-full transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`
    : 'liquid-glass w-60 shrink-0 h-full';

  return (
    <>
      {isMobile && (
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside className={asideClass}>
      <div className="h-full flex flex-col relative z-10">
        <MoonPhase />

        <div className="px-3 pb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={sidebarConfig.searchPlaceholder}
            className="w-full px-3 py-2 text-sm bg-white/[0.03] rounded-lg text-[#e0e0e0] placeholder:text-[#444] focus:outline-none focus:bg-white/[0.05] transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {sorted.length === 0 && (
            <p className="text-center text-xs text-[#444] mt-8 font-serif-cn">{search ? sidebarConfig.noResultsLabel : sidebarConfig.emptyNotesLabel}</p>
          )}
          {sorted.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelect(note.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all ${
                note.id === selectedId
                  ? 'bg-white/[0.06] text-[#e0e0e0]'
                  : 'text-[#888] hover:bg-white/[0.03] hover:text-[#bbb]'
              }`}
            >
              <div className="font-serif-cn text-sm truncate leading-relaxed">{note.title}</div>
            </button>
          ))}
        </div>

        {/* Footer branding */}
        <div className="p-3 border-t border-white/[0.03]">
          <div className="text-center">
            <span className="text-[10px] text-[#333] tracking-widest font-serif-cn">
              墨浅 &middot; {notes.length} {sidebarConfig.noteCountSuffix}
            </span>
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}

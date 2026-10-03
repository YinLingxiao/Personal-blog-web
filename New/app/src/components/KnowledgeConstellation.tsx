interface Note { id: string; title: string; category: string }
interface Category { name: string; count: number }
interface Props {
  notes: Note[];
  categories: Category[];
  selected: string | null;
  active: string | null;
  base: string;
  onCategory: (name: string | null) => void;
  onActive: (id: string | null) => void;
}

export default function KnowledgeConstellation({ notes, categories, selected, active, base, onCategory, onActive }: Props) {
  const center = { x: 220, y: 170 };
  const categoryNodes = categories.map((category, index) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / categories.length;
    return { ...category, x: center.x + Math.cos(angle) * 135, y: center.y + Math.sin(angle) * 115 };
  });
  const noteNodes = notes.map((note, index) => {
    const innerCount = Math.min(7, notes.length);
    const inner = index < innerCount;
    const ringIndex = inner ? index : index - innerCount;
    const ringCount = inner ? innerCount : notes.length - innerCount;
    const angle = -Math.PI / 2 + ringIndex * 2 * Math.PI / ringCount;
    return { ...note, x: 282 + Math.cos(angle) * (inner ? 56 : 118), y: 170 + Math.sin(angle) * (inner ? 61 : 126) };
  });
  return <div className="knowledge-constellation">
    <svg viewBox="0 0 440 340" role="group" aria-label={selected ? `${selected}，${notes.length} 篇笔记的连接图` : `${categories.length} 个笔记分类的连接图`}>
      <g aria-hidden="true" className="constellation-orbit"><circle cx="215" cy="170" r="140"/><path d="M10 170H430M215 10V330" /></g>
      {selected ? <>
        <g className="constellation-category" aria-hidden="true"><circle cx="72" cy="170" r="8"/><circle cx="72" cy="170" r="12"/><text x="72" y="200" textAnchor="middle">{selected.length > 7 ? `${selected.slice(0, 7)}…` : selected} · {notes.length}</text></g>
        {noteNodes.map(note => <g key={`edge-${note.id}`} aria-hidden="true"><path className={`constellation-edge ${active === note.id ? 'is-active' : ''}`} d={`M72,170 Q180,${note.y} ${note.x},${note.y}`} /></g>)}
        {noteNodes.map((note, index) => <a key={note.id} href={`${base}/post/${encodeURIComponent(note.id)}`} target="_blank" rel="noopener noreferrer" aria-label={`${index + 1}. ${note.title}`} className="constellation-note" data-active={active === note.id || undefined}
          onPointerEnter={() => onActive(note.id)} onPointerLeave={() => onActive(null)} onFocus={() => onActive(note.id)} onBlur={() => onActive(null)}>
          <circle className="constellation-hit" cx={note.x} cy={note.y} r="22"/><circle className="constellation-halo" cx={note.x} cy={note.y} r="12"/>
          <circle className="constellation-core" cx={note.x} cy={note.y} r="3.5"/>
          <text x={note.x + 13} y={note.y + 4}>{String(index + 1).padStart(2, '0')}</text>
          <title>{note.title}</title>
        </a>)}
      </> : <>
        {categoryNodes.map(category => <path key={`edge-${category.name}`} className="constellation-edge" aria-hidden="true" d={`M${center.x},${center.y} Q${center.x},${category.y} ${category.x},${category.y}`} />)}
        <g className="constellation-category" aria-hidden="true"><circle cx={center.x} cy={center.y} r="11"/><circle cx={center.x} cy={center.y} r="16"/><text x={center.x} y={center.y + 34} textAnchor="middle">全部 · {notes.length}</text></g>
        {categoryNodes.map(category => <g key={category.name} role="button" tabIndex={0} aria-label={`查看${category.name}分类，${category.count}篇笔记`} className="constellation-category constellation-category-action"
          onClick={() => onCategory(category.name)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onCategory(category.name); } }}>
          <circle className="constellation-hit" cx={category.x} cy={category.y} r="22"/><circle cx={category.x} cy={category.y} r="8"/><circle cx={category.x} cy={category.y} r="12"/>
          <text x={category.x} y={category.y + 29} textAnchor="middle">{category.name.length > 7 ? `${category.name.slice(0, 7)}…` : category.name} · {category.count}</text>
          <title>{category.name}</title>
        </g>)}
      </>}
    </svg>
    <p className="living-label">{selected ? '分类相连 · 选择星点，翻开笔记' : '分类星图 · 选择分类，查看笔记'}</p>
  </div>;
}

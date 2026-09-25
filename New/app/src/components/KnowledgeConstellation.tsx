interface Note { id: string; title: string; category?: string }
interface Props { notes: Note[]; categories: { name: string; count: number }[]; base: string; active: string | null; onActive: (id: string | null) => void }
export default function KnowledgeConstellation({ notes, categories, base, active, onActive }: Props) {
  const items = notes.slice(0, 5);
  const groups = Array.from(new Set(items.map(n => n.category).filter((name): name is string => !!name)));
  const positions = items.map((n, i) => ({ ...n, x: 218 + (i % 2) * 132, y: 48 + i * 54 }));
  const categoryPositions = groups.map((name, i) => ({ name, x: 65 + (i % 2) * 36, y: 72 + i * (210 / Math.max(1, groups.length - 1)) }));
  return <div className="knowledge-constellation">
    <svg viewBox="0 0 440 340" role="group" aria-label="最近笔记与分类的星图">
      <g aria-hidden="true" className="constellation-orbit"><circle cx="215" cy="170" r="140"/><path d="M10 170H430M215 10V330" /></g>
      {positions.map(n => {
        const cat = categoryPositions.find(c => c.name === n.category);
        return cat && <path key={`edge-${n.id}`} aria-hidden="true" className={`constellation-edge ${active === n.id ? 'is-active' : ''}`} d={`M${cat.x},${cat.y} Q210,${cat.y} ${n.x},${n.y}`} />;
      })}
      {categoryPositions.map(c => <g key={c.name} className="constellation-category" aria-hidden="true">
        <circle cx={c.x} cy={c.y} r="8"/><circle cx={c.x} cy={c.y} r="12"/>
        <text x={c.x} y={c.y + 29} textAnchor="middle">{c.name} · {categories.find(x => x.name === c.name)?.count ?? 0}</text>
      </g>)}
      {positions.map((n, i) => <a key={n.id} href={`${base}/post/${encodeURIComponent(n.id)}`} target="_blank" rel="noopener noreferrer"
        aria-label={n.title} className={`constellation-note ${active === n.id ? 'is-active' : ''}`}
        onPointerEnter={() => onActive(n.id)} onPointerLeave={() => onActive(null)} onFocus={() => onActive(n.id)} onBlur={() => onActive(null)}>
        <circle className="constellation-hit" cx={n.x} cy={n.y} r="22"/><circle className="constellation-halo" cx={n.x} cy={n.y} r="12"/>
        <circle className="constellation-core" cx={n.x} cy={n.y} r="3.5"/>
        <text x={n.x + 15} y={n.y + 4} aria-hidden="true">{String(i + 1).padStart(2, '0')}</text>
        <title>{n.title}</title>
      </a>)}
    </svg><p className="living-label">分类相连 · 选择星点，翻开笔记</p>
  </div>;
}

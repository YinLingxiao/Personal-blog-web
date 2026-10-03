export function buildNoteCatalog(source) {
  if (!Array.isArray(source)) throw new Error('Note index must be an array');
  const counts = new Map();
  const items = source.filter(note => note && typeof note.id === 'string' && typeof note.title === 'string').map(note => {
    const category = String(note.category || '').trim() || '未分类';
    counts.set(category, (counts.get(category) || 0) + 1);
    const [subject, ...kind] = note.title.split(/\s*—{2,}\s*/);
    return {
      id: note.id,
      title: subject.trim() || note.title.trim(),
      kind: kind.join(' ').trim(),
      category,
      tags: Array.isArray(note.tags) ? note.tags.slice(0, 3).filter(tag => typeof tag === 'string') : [],
      updatedAt: Number.isFinite(note.updatedAt) ? note.updatedAt : 0,
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id, 'zh'));
  const categories = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
    .map(([name, count]) => ({ name, count }));
  return { total: items.length, categories, items };
}

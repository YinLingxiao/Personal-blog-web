export type Site = 'home' | 'blog' | 'note';

export function getUploadLinks(site: Site) {
  const blogOrigin = site === 'note' ? (import.meta.env.DEV ? 'http://localhost:3000' : 'https://moqian.me') : '';
  const noteOrigin = site === 'note' ? '' : (import.meta.env.DEV ? 'http://localhost:3001' : 'https://note.moqian.me');
  return [
    { target: 'blog', label: '上传博文', subtitle: 'Ballade · 文章与随笔', href: `${blogOrigin}/blog/admin/upload`, icon: 'pen' },
    { target: 'note', label: '上传笔记', subtitle: 'Étude · 学习与记录', href: `${noteOrigin}/admin/upload`, icon: 'book' },
  ] as const;
}

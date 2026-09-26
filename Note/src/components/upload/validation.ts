const allowedImages = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']);

export function validateFiles(files: File[]) {
  if (!files.length) return '请选择一个内容文件夹';
  const roots = new Set(files.map((file) => file.webkitRelativePath.split('/')[0]));
  if (roots.size !== 1 || [...roots][0] === '') return '一次请选择一个完整文件夹';
  if (files.some((file) => file.webkitRelativePath.split('/').length !== 2)) return '请把正文与图片放在同一层，不要包含子文件夹';
  if (files.filter((file) => file.name === 'index.md').length !== 1) return '文件夹中需要有一个名为 index.md 的正文文件';
  if (files.some((file) => file.name.toLowerCase().endsWith('.md') && file.name !== 'index.md')) return '一个文件夹只能包含一篇正文，请保留 index.md';
  if (files.some((file) => file.name !== 'index.md' && !allowedImages.has(file.name.split('.').pop()?.toLowerCase() || ''))) return '只支持 index.md 与 PNG、JPG、GIF、WebP、AVIF 图片';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test([...roots][0])) return '文件夹名请使用小写字母、数字和单连字符，例如 my-first-post';
  return '';
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

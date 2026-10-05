export function normalizeDisplayMath(body) {
  const stash = [];
  const protect = (text) => { stash.push(text); return `\uE000${stash.length - 1}\uE001`; };
  let out = body.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, protect).replace(/`[^`\n]*`/g, protect);
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_match, inner) => `\n\n$$\n${inner.trim()}\n$$\n\n`);
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.replace(/\uE000(\d+)\uE001/g, (_match, index) => stash[Number(index)]).trim();
}

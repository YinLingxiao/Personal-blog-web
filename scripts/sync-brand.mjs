import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const svg = await readFile(resolve(root, 'shared/brand/moqian-wordmark.svg'), 'utf8');
const path = svg.match(/<path[^>]* d="([^"]+)"/)?.[1];
if (!path) throw new Error('Moqian wordmark SVG is missing its path.');
const sources = new Map([
  ['MoqianSignature.tsx', await readFile(resolve(root, 'shared/brand/MoqianSignature.tsx'), 'utf8')],
  ['signature.css', await readFile(resolve(root, 'shared/brand/signature.css'), 'utf8')],
  ['BrandMark.tsx', await readFile(resolve(root, 'shared/brand/BrandMark.tsx'), 'utf8')],
  ['BrandMark.css', await readFile(resolve(root, 'shared/brand/BrandMark.css'), 'utf8')],
  ['wordmark-path.ts', `export const WORDMARK_PATH = ${JSON.stringify(path)};\n`],
]);

for (const project of ['New/app', 'Blog', 'Note']) {
  const directory = resolve(root, project, 'src/components/brand');
  if (!check) await mkdir(directory, { recursive: true });
  for (const [name, content] of sources) {
    const destination = resolve(directory, name);
    if (check) {
      if (await readFile(destination, 'utf8') !== content) throw new Error(`Brand differs: ${destination}`);
    } else {
      await writeFile(destination, content);
    }
  }

}
console.log(`Moqian brand (signature + mark) ${check ? 'verified' : 'synced'} across Home, Blog and Note.`);

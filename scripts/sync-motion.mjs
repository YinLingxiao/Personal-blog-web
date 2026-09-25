import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const project of ['New/app', 'Blog', 'Note']) {
  const dest = path.join(root, project, 'src/components/motion');
  if (!process.argv.includes('--check')) await mkdir(dest, { recursive: true });
  for (const file of ['motion.ts', 'MotionControls.tsx', 'motion.css', 'CustomCursor.tsx']) {
    const source = await readFile(path.join(root, 'shared/motion', file));
    const target = path.join(dest, file);
    if (process.argv.includes('--check')) {
      if (!source.equals(await readFile(target))) throw new Error(`Motion source differs: ${target}`);
    } else await writeFile(target, source);
  }
}
console.log('Motion sources synchronized.');

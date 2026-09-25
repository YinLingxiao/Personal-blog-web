import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const targets = ['New/app/src/lib', 'Blog/src/lib', 'video-downloader/static/js'];
for (const target of targets) {
  for (const extension of target.endsWith('/js') ? ['js'] : ['js', 'd.ts']) {
    const content = await readFile(resolve(root, `shared/starfield.${extension}`), 'utf8');
    const destination = resolve(root, target, `starfield.${extension}`);
    if (check) {
      if (await readFile(destination, 'utf8') !== content) throw new Error(`Starfield differs: ${target}`);
    } else {
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
  }
}
console.log(`Starfield ${check ? 'verified' : 'synced'} across Home, Blog and video downloader.`);

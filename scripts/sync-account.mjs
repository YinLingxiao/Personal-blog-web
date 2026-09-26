import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
for (const [group, files, projects] of [
  ['account', ['AccountMenu.tsx', 'account.css', 'destinations.ts', 'icons.tsx'], ['New/app', 'Blog', 'Note']],
  ['upload', ['UploadWorkspace.tsx', 'upload.css', 'validation.ts'], ['Blog', 'Note']],
]) {
  for (const file of files) {
    const source = await readFile(resolve(root, 'shared', group, file), 'utf8');
    for (const project of projects) {
      const directory = resolve(root, project, 'src/components', group);
      const destination = resolve(directory, file);
      if (check) {
        if (await readFile(destination, 'utf8') !== source) throw new Error(`Shared UI differs: ${destination}`);
      } else {
        await mkdir(directory, { recursive: true });
        await writeFile(destination, source);
      }
    }
  }
}
console.log(`Account menus and upload workspaces ${check ? 'verified' : 'synced'}.`);

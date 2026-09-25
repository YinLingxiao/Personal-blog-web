// 拉取 GitHub 公开仓库，生成 Home「Sonata」区项目卡的数据源（public/github-pins.json）。
// 手动运行、best-effort：网络失败或限流时保留上一份产物并告警。
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USER = 'YinLingxiao';
const OUT = resolve(__dirname, '../public/github-pins.json');
const MAX = 6;

function fetchJson(url) {
  return new Promise((resolvePromise, reject) => {
    get(
      url,
      { headers: { 'User-Agent': 'moqian-site-build', Accept: 'application/vnd.github+json' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolvePromise(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      },
    ).on('error', reject);
  });
}

try {
  const repos = await fetchJson(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=${MAX * 2}`);
  const pins = (Array.isArray(repos) ? repos : [])
    .filter((repo) => repo && !repo.fork && !repo.private)
    // 误建仓库（名字只有标点，如 "-"）在节目单里读不出任何信息，构建期直接剔除。
    .filter((repo) => /[a-z0-9\u4e00-\u9fa5]/i.test(repo.name || ''))
    .slice(0, MAX)
    .map((repo) => ({
      name: repo.name,
      description: (repo.description || '').trim(),
      language: repo.language || '',
      stars: repo.stargazers_count || 0,
      url: repo.html_url,
    }));
  writeFileSync(OUT, `${JSON.stringify(pins, null, 2)}\n`);
  console.log(`[fetch-github] wrote ${pins.length} repos to public/github-pins.json`);
} catch (error) {
  console.warn(`[fetch-github] skipped (${error instanceof Error ? error.message : error}); keeping existing public/github-pins.json`);
}

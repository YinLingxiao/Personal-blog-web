import { useEffect, useState, type PointerEvent } from 'react';
import SectionHeader from '@/components/SectionHeader';
import ScoreSilhouette from '@/components/ScoreSilhouette';
import { useMotionPolicy } from '@/components/motion/motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface Project { name: string; description: string; language: string; url: string }
const utility: Project = { name: '视频下载工具', description: '', language: 'Utility', url: 'https://video.moqian.me/' };
const timeline = [
  { text: '知识花园 note.moqian.me —— 课程笔记与知识图谱，持续更新。', href: 'https://note.moqian.me/' },
  { text: '本站一体化 —— 主页、博客与笔记共用一套设计语言。', href: '/' },
  { text: '站点账户体系 —— OAuth 登录与内容上传接口，正在接线。', href: '' },
];
export default function OpusSection() {
  const header = useScrollAnimation<HTMLDivElement>();
  const [repos, setRepos] = useState<Project[]>([]);
  const [selected, setSelected] = useState(0);
  const { reduced } = useMotionPolicy();
  useEffect(() => {
    const controller = new AbortController();
    fetch('/github-pins.json', { signal: controller.signal }).then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data)) setRepos(data.filter((p): p is Project => !!p && typeof p.name === 'string' && typeof p.url === 'string' && /^https?:\/\//.test(p.url)));
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  const projects = [...repos.filter(p => p.name !== 'Video-downloader'), { ...utility, description: repos.find(p => p.name === 'Video-downloader')?.description || '' }];
  const index = Math.min(selected, projects.length - 1);
  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== 'mouse' || !matchMedia('(pointer: fine)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--rx', `${-((e.clientY - rect.top) / rect.height - .5) * 6}deg`);
    e.currentTarget.style.setProperty('--ry', `${((e.clientX - rect.left) / rect.width - .5) * 6}deg`);
  };
  const reset = (e: PointerEvent<HTMLDivElement>) => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); };
  const preview = (p: Project, i: number) => <>
    <div className="project-art" onPointerMove={tilt} onPointerLeave={reset} aria-hidden="true">
      <div className="project-art-plane"><span className="project-roman">{['I', 'II', 'III', 'IV'][i] || 'V'}</span>
        <div className="project-staff">{Array.from({ length: 5 }, (_, n) => <i key={n} />)}</div>
        <span className="project-glyph">{p.name === '视频下载工具' ? '↓' : p.name.slice(0, 1)}</span>
        <span className="project-art-label">{p.language || 'Selected work'}</span>
      </div>
    </div>
    <div className="project-caption"><span className="living-label">Opus / {String(i + 1).padStart(2, '0')}</span>
      <h3>{p.name}</h3>{p.description && <p>{p.description}</p>}
      <a href={p.url} target="_blank" rel="noopener noreferrer">打开项目 <span aria-hidden="true">↗</span></a>
    </div>
  </>;
  return <section id="opus" className="opus-section score-host relative py-20 md:py-28">
    <ScoreSilhouette piece="opus" variant="section" />
    <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-8">
      <div ref={header}><SectionHeader number="03" title="Opus" subtitle="作品 · Selected Works" /></div>
      <div className="opus-introduction"><h3>Sonata <span>I / Solo works</span></h3>
        <p>从一个念头开始，独自完成的产品、工具与长期实验。保留个人判断，也保留不成熟的棱角。</p></div>
      <div className="project-desktop">
        <div className="project-selector" aria-label="选择项目预览"><span className="living-label">GitHub · 开源仓库 / Utility</span>
          {projects.map((p, i) => <button key={p.name} type="button" aria-pressed={index === i} aria-controls="project-preview" onClick={() => setSelected(i)}>
            <span className="project-number">{String(i + 1).padStart(2, '0')}</span><span>{p.name}<small>{p.language || 'Selected work'}</small></span><span aria-hidden="true">↗</span>
          </button>)}
          <a className="project-all" href="https://github.com/YinLingxiao" target="_blank" rel="noopener noreferrer">在 GitHub 上查看全部仓库 ↗</a>
        </div>
        <div id="project-preview" className="project-stage" aria-live="polite">
          {projects.map((p, i) => <article key={p.name} className={i === index ? 'project-entry is-active' : 'project-entry'} aria-hidden={i !== index} inert={i !== index}>{preview(p, i)}</article>)}
        </div>
      </div>
      <div className="project-mobile">{projects.map((p, i) => <article key={p.name}>{preview(p, i)}</article>)}</div>
      <div className="concerto"><div><h3>Concerto <span>II / In progress</span></h3><p>正在发生与尚未公开的事，按时间缓缓铺开。</p></div>
        <ol>{timeline.map(item => <li key={item.text}><time>2026</time>{item.href ? <a href={item.href}>{item.text}</a> : <span>{item.text}</span>}</li>)}</ol>
      </div>
    </div>
  </section>;
}

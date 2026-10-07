import snapshot from "@/generated/posts.json";
import type { Post } from "@/types";

export type DemoPost = Post & {
  artwork?: "galaxy" | "notes" | "type" | "score" | "moon" | "book";
  sample?: boolean;
};
export const demoAssetBase = `${import.meta.env.BASE_URL}demo/arena/assets/`;

const source = (snapshot as Post[]).find(
  post => post.id === "moqian-program-note"
);
const sampleEntries: Array<
  [string, string, string, string, DemoPost["artwork"]]
> = [
  [
    "quiet-days",
    "浅墨之间，把日常慢慢写下来",
    "随笔",
    "有些念头不必急着成为答案。先把它们写下来，留给未来的自己，再读一遍。",
    "galaxy",
  ],
  [
    "knowledge-garden",
    "让知识长成自己的形状",
    "技术",
    "从一篇笔记到一张图谱。用双向链接，把零散的理解连成一片可以继续生长的知识花园。",
    "notes",
  ],
  [
    "whitespace",
    "留白，也是设计的一部分",
    "随笔",
    "当颜色、边框和装饰逐一退场，文字之间的距离，开始决定一个页面的语气。",
    "type",
  ],
  [
    "a-melody",
    "从一段旋律开始",
    "随笔",
    "关于肖邦，关于叙事曲，也关于那些不需要解释、却让人愿意停留的片刻。",
    "score",
  ],
  [
    "ascii-moon",
    "用字符画一轮月亮",
    "技术",
    "字符、光点与三维空间。一轮月亮如何从最简单的符号里，慢慢浮现。",
    "moon",
  ],
  [
    "unfinished-reading",
    "读书，和一些未完成的想法",
    "阅读",
    "读到一半的书，写在页边的问题。那些还没有结论的句子，也是阅读留下的痕迹。",
    "book",
  ],
];

const samples: DemoPost[] = sampleEntries.map(
  ([id, title, category, summary, artwork], index) => ({
    id,
    title,
    category,
    summary,
    artwork,
    sample: true,
    tags: [],
    createdAt: Date.UTC(2026, 8, 28 - index * 3),
    updatedAt: Date.UTC(2026, 8, 28 - index * 3),
    content: `${summary}\n\n这是一篇用于展示阅读排版的示例。这里可以放一段完整的叙述，让标题、正文与留白共同形成安静的阅读节奏。\n\n## 把注意力交给文字\n\n页面的结构越清楚，读者就越容易走进内容。中文用华文中宋，配以舒展的行距；日期和导航保持简洁，让每一种信息都有自己的位置。\n\n> 于浅墨之间，写一点不急的字。\n\n文字可以慢慢读，想法也可以慢慢完成。`,
  })
);

const opening: DemoPost = source
  ? {
      ...source,
      cover: `${demoAssetBase}cover.png`,
      content: source.content.replaceAll(
        `/blog/posts/${source.id}/`,
        demoAssetBase
      ),
    }
  : {
      id: "moqian-program-note",
      title: "墨浅：一份写给自己的节目单",
      category: "随笔",
      summary:
        "以设计者的身份，聊聊墨浅这座个人网站为什么长成现在的样子：节目单式的结构、只用灰阶的配色，以及藏在动效背后的克制。",
      content: "于浅墨之间，写一点不急的字。",
      createdAt: Date.UTC(2026, 9, 6),
      updatedAt: Date.UTC(2026, 9, 6),
      tags: [],
      cover: `${demoAssetBase}cover.png`,
      sample: true,
    };

export const demoPosts: DemoPost[] = [opening, ...samples];

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, X, ArrowUpRight } from "lucide-react";
import type { Post } from "@/types";
import "../pages/editorial.css";

export type EditorialPost = Post & {
  artwork?: "galaxy" | "notes" | "type" | "score" | "moon" | "book";
};

function stripMarkdown(raw: string) {
  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(
      /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g,
      (_m, target: string, _a, alias?: string) => alias || target
    )
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>)\s*/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptOf(post: Post, limit: number) {
  return post.summary || stripMarkdown(post.content).slice(0, limit);
}

function Meta({ post }: { post: EditorialPost }) {
  const d = new Date(post.updatedAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (
    <p className="ae-meta">
      <span className="ae-category">{post.category || "未分类"}</span>
      <span>
        墨浅<span className="ae-meta__dash">—</span>
        <time dateTime={date}>{date.replaceAll("-", ".")}</time>
      </span>
    </p>
  );
}

function Artwork({ post }: { post: EditorialPost }) {
  if (post.cover || post.artwork === "galaxy") {
    return (
      <img
        src={
          post.cover ||
          `${import.meta.env.BASE_URL}demo/arena/assets/prelude-galaxy.png`
        }
        alt=""
        decoding="async"
      />
    );
  }
  if (!post.artwork) {
    return (
      <div className="ae-art ae-art--placeholder" aria-hidden="true">
        <span>{post.title.trim().slice(0, 1)}</span>
        <i lang="en">Ballade</i>
      </div>
    );
  }
  return (
    <div className={`ae-art ae-art--${post.artwork}`} aria-hidden="true">
      {post.artwork === "type" ? (
        <div className="ae-type">
          <span>Less, but better.</span>
          <p>留白之间</p>
          <i>Space to think.</i>
        </div>
      ) : post.artwork === "score" ? (
        <svg viewBox="0 0 600 340">
          <g stroke="currentColor" opacity=".32">
            {[138, 153, 168, 183, 198].map(y => (
              <path key={y} d={`M64 ${y}H536`} />
            ))}
          </g>
          <g fill="currentColor" opacity=".8">
            {[
              [140, 183],
              [210, 168],
              [278, 153],
              [347, 168],
              [414, 183],
              [480, 198],
            ].map(([x, y]) => (
              <g key={x}>
                <ellipse
                  cx={x}
                  cy={y}
                  rx="10"
                  ry="6"
                  transform={`rotate(-22 ${x} ${y})`}
                />
                <path d={`M${x + 8} ${y}v-53h2v53z`} />
              </g>
            ))}
          </g>
          <text x="64" y="91" className="ae-art-label">
            Ballade No. 1
          </text>
          <text
            x="536"
            y="260"
            textAnchor="end"
            className="ae-art-label ae-art-label--small"
          >
            CHOPIN · OP. 23
          </text>
        </svg>
      ) : post.artwork === "notes" ? (
        <svg viewBox="0 0 600 340">
          <g stroke="currentColor" strokeWidth="1" opacity=".3">
            {[
              [112, 190],
              [245, 90],
              [446, 95],
              [482, 255],
              [290, 265],
            ].map(([x, y]) => (
              <path key={x} d={`M310 166L${x} ${y}`} />
            ))}
            <path
              d="M112 190L245 90L446 95L482 255L290 265Z"
              strokeDasharray="4 6"
            />
          </g>
          <g fill="currentColor">
            {[
              [112, 190, 7],
              [245, 90, 5],
              [446, 95, 7],
              [482, 255, 5],
              [310, 166, 15],
            ].map(([x, y, r]) => (
              <circle
                key={x}
                cx={x}
                cy={y}
                r={r}
                opacity={x === 310 ? ".85" : ".5"}
              />
            ))}
            <circle
              cx="290"
              cy="265"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeDasharray="3 4"
              opacity=".6"
            />
          </g>
          <text x="54" y="45" className="ae-art-label ae-art-label--small">
            A GARDEN OF IDEAS
          </text>
        </svg>
      ) : post.artwork === "moon" ? (
        <svg viewBox="0 0 600 340">
          <circle
            cx="300"
            cy="170"
            r="92"
            fill="none"
            stroke="currentColor"
            strokeWidth=".6"
            opacity=".2"
          />
          <path
            d="M300 78a92 92 0 0 0 0 184Z"
            fill="currentColor"
            opacity=".7"
          />
          <g fill="currentColor" opacity=".34">
            {[...Array(42)].map((_, i) => (
              <circle
                key={i}
                cx={222 + (i % 6) * 14}
                cy={121 + Math.floor(i / 6) * 16}
                r="1.2"
              />
            ))}
          </g>
          <text
            x="300"
            y="304"
            textAnchor="middle"
            className="ae-art-label ae-art-label--small"
          >
            A MOON, IN CHARACTERS
          </text>
        </svg>
      ) : (
        <svg viewBox="0 0 600 340">
          <g fill="none" stroke="currentColor" strokeWidth="1" opacity=".65">
            <path d="M300 267V95c-50-32-102-31-156-14v172c54-17 106-18 156 14Zm0 0V95c50-32 102-31 156-14v172c-54-17-106-18-156 14Z" />
            {[115, 143, 171, 199].map(y => (
              <g key={y} opacity=".3">
                <path d={`M173 ${y}q58-10 97 7M330 ${y + 7}q39-17 97-7`} />
              </g>
            ))}
          </g>
          <text
            x="300"
            y="314"
            textAnchor="middle"
            className="ae-art-label ae-art-label--small"
          >
            NOTES IN THE MARGIN
          </text>
        </svg>
      )}
    </div>
  );
}

function PostCard({
  post,
  postBase,
}: {
  post: EditorialPost;
  postBase: string;
}) {
  return (
    <article className="ae-card">
      <Link to={`${postBase}/${post.id}`} aria-label={`阅读：${post.title}`}>
        <div className="ae-cover">
          <Artwork post={post} />
          <span className="ae-cover__read" aria-hidden="true">
            阅读全文
            <ArrowUpRight size={15} />
          </span>
        </div>
        <h2>{post.title}</h2>
        <p className="ae-excerpt">{excerptOf(post, 160)}</p>
        <Meta post={post} />
      </Link>
    </article>
  );
}

export default function BlogIndex({
  posts,
  isLoading = false,
  error = false,
  postBase = "/post",
}: {
  posts: EditorialPost[];
  isLoading?: boolean;
  error?: boolean;
  postBase?: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const categories = useMemo(
    () =>
      [
        ...new Set(
          posts
            .map(post => post.category)
            .filter((value): value is string => Boolean(value))
        ),
      ].sort((a, b) => {
        const order = ["随笔", "技术", "阅读"];
        const rank = (name: string) => {
          const index = order.indexOf(name);
          return index < 0 ? order.length : index;
        };
        return rank(a) - rank(b) || a.localeCompare(b, "zh-CN");
      }),
    [posts]
  );
  const sorted = useMemo(
    () => [...posts].sort((a, b) => b.updatedAt - a.updatedAt),
    [posts]
  );
  const filtering = Boolean(category || query.trim());
  const search = query.trim().toLowerCase();
  const matches = sorted.filter(
    post =>
      (!category || post.category === category) &&
      `${post.title} ${post.summary || ""} ${post.content} ${post.tags.join(" ")}`
        .toLowerCase()
        .includes(search)
  );
  const featured = filtering ? null : matches[0];
  const cards = featured ? matches.slice(1) : matches;

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  function applyCategory(value: string | null) {
    setSearchParams(
      previous => {
        const next = new URLSearchParams(previous);
        if (value) next.set("category", value);
        else next.delete("category");
        return next;
      },
      { replace: true }
    );
  }

  function closeSearch() {
    setQuery("");
    setSearchOpen(false);
    searchButtonRef.current?.focus();
  }

  return (
    <>
      <div className="ae-masthead">
        <p className="ae-kicker">
          <span>
            墨浅 · <span lang="en">Moqian</span>
          </span>
          <span className="ae-kicker__rule" aria-hidden="true" />
          <span lang="en">Essays &amp; Writings</span>
        </p>
        <h1 id="ae-title" className="ae-title" lang="en">
          Ballade
          <span className="sr-only" lang="zh-CN">
            {" "}
            · 墨浅博文
          </span>
        </h1>
      </div>
      <p className="sr-only" aria-live="polite">
        {isLoading
          ? "正在读取文章"
          : error
            ? "文章读取失败"
            : `共 ${matches.length} 篇文章`}
      </p>
      <div className="ae-toolbar">
        <nav className="ae-tabs" aria-label="文章分类">
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => applyCategory(null)}
          >
            全部
          </button>
          {categories.map(name => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => applyCategory(name)}
            >
              {name}
            </button>
          ))}
        </nav>
        <button
          className="ae-icon-button"
          ref={searchButtonRef}
          type="button"
          onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          aria-label="检索文章"
          aria-expanded={searchOpen}
          aria-controls="ae-search"
        >
          <Search size={17} />
        </button>
      </div>
      {searchOpen && (
        <div className="ae-search" id="ae-search">
          <label htmlFor="ae-query">
            <Search size={17} />
            <span className="sr-only">检索标题、正文或标签</span>
          </label>
          <input
            id="ae-query"
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") closeSearch();
            }}
            placeholder="检索标题、正文或标签"
            type="search"
          />
          <button
            className="ae-icon-button"
            type="button"
            aria-label="关闭检索"
            onClick={closeSearch}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {!isLoading && !error && featured && (
        <section className="ae-feature" aria-label="最新文章">
          <Link
            className="ae-feature__link"
            to={`${postBase}/${featured.id}`}
            aria-label={`阅读：${featured.title}`}
          >
            <div className="ae-feature__text">
              <Meta post={featured} />
              <div>
                <h2>{featured.title}</h2>
                <p className="ae-feature__excerpt">
                  {excerptOf(featured, 220)}
                </p>
                <div className="ae-feature__action" aria-hidden="true">
                  <span>
                    阅读全文
                    <ArrowUpRight size={15} />
                  </span>
                </div>
              </div>
            </div>
            <div className="ae-feature__cover">
              <Artwork post={featured} />
            </div>
          </Link>
        </section>
      )}

      {isLoading || error ? (
        <div className="ae-empty" role="status">
          <p>
            {error ? "暂时无法读取文章，请稍后刷新重试。" : "正在打开文集…"}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="ae-empty" role="status">
          <p>文集暂时留白，新篇正在酝酿。</p>
        </div>
      ) : cards.length > 0 ? (
        <section
          key={category || "all"}
          className="ae-grid"
          aria-label="文章列表"
        >
          {cards.map(entry => (
            <PostCard key={entry.id} post={entry} postBase={postBase} />
          ))}
        </section>
      ) : !featured ? (
        <div className="ae-empty" role="status">
          <p>没有找到相符的文章。</p>
          <button
            type="button"
            onClick={() => {
              applyCategory(null);
              setQuery("");
            }}
          >
            查看全部文章
            <ArrowUpRight size={15} />
          </button>
        </div>
      ) : null}
    </>
  );
}

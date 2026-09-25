export interface SiteConfig {
  title: string
  description: string
  language: string
}

export interface HeaderConfig {
  homeUrl: string
  noteUrl: string
}

export interface ReaderConfig {
  outgoingLinksLabel: string
  incomingLinksLabel: string
}

export const siteConfig: SiteConfig = {
  title: "墨浅博文",
  description: "于浅墨之间，写一点不急的字。个人随笔与技术札记的存放处。",
  language: "zh-CN",
}

export const headerConfig: HeaderConfig = {
  // 生产环境下反向代理把 Home 挂在站点根、Blog 挂在 /blog/，所以 "/" 就是主页；
  // 本地开发时两者是不同端口的独立 dev server，必须显式指向 Home 的 :8080。
  homeUrl: import.meta.env.DEV ? "http://localhost:8080/" : "/",
  noteUrl: import.meta.env.DEV ? "http://localhost:3001/" : "https://note.moqian.me/",
}

export const readerConfig: ReaderConfig = {
  outgoingLinksLabel: "提及:",
  incomingLinksLabel: "被引:",
}

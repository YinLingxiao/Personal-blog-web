export type BackgroundMode = 'solid' | 'silk' | 'moonlit' | 'rain';

export interface SiteConfig {
  title: string
  description: string
  language: string
}

export interface HeaderConfig {
  brandMark: string
  siteBadge: string
  noteCountSuffix: string
  editorViewLabel: string
  graphViewLabel: string
  backgroundButtonTitle: string
  importButtonLabel: string
  menuButtonTitle: string
  homeUrl: string
  homeButtonLabel: string
  homeButtonTitle: string
}

export interface BackgroundOption {
  id: BackgroundMode
  label: string
}

export interface SolidColorOption {
  color: string
  label: string
}

export interface BackgroundConfig {
  defaultMode: BackgroundMode
  defaultSolidColor: string
  options: BackgroundOption[]
  solidColors: SolidColorOption[]
}

export interface SidebarConfig {
  searchPlaceholder: string
  noResultsLabel: string
  emptyNotesLabel: string
  noteCountSuffix: string
}

export interface EditorConfig {
  editLabel: string
  previewLabel: string
  sourceLabel: string
  deleteLabel: string
  cancelLabel: string
  titlePlaceholder: string
  contentPlaceholder: string
  outgoingLinksLabel: string
  incomingLinksLabel: string
}

export interface GraphConfig {
  notesLabel: string
  connectionsLabel: string
  emptyGraphLabel: string
  categoriesLabel: string
  uncategorizedLabel: string
  overviewHint: string
  backToOverviewLabel: string
}

export interface MoonConfig {
  phaseLabels: string[]
}

export interface AppConfig {
  emptyStateLabel: string
}

export const siteConfig: SiteConfig = {
  title: "墨浅笔记",
  description: "案头随手的笔记与札记，未必成文，但都在生长。",
  language: "zh-CN",
}

export const headerConfig: HeaderConfig = {
  brandMark: "墨浅",
  siteBadge: "笔记",
  noteCountSuffix: "篇",
  editorViewLabel: "笔记",
  graphViewLabel: "脉络",
  backgroundButtonTitle: "切换背景",
  importButtonLabel: "",
  menuButtonTitle: "笔记目录",
  homeUrl: import.meta.env.DEV ? "http://localhost:8080/" : "https://moqian.me/",
  homeButtonLabel: "主页",
  homeButtonTitle: "返回主页",
}

export const backgroundConfig: BackgroundConfig = {
  defaultMode: 'moonlit',
  defaultSolidColor: '#050505',
  options: [
    { id: 'moonlit', label: "月夜" },
    { id: 'silk', label: "丝流" },
    { id: 'rain', label: "雨窗" },
    { id: 'solid', label: "纯色" },
  ],
  solidColors: [
    { color: '#050505', label: "墨色" },
    { color: '#f5f0e8', label: "宣纸" },
    { color: '#1a1a2e', label: "靛蓝" },
    { color: '#0d1f0d', label: "松绿" },
  ],
}

export const sidebarConfig: SidebarConfig = {
  searchPlaceholder: "搜索",
  noResultsLabel: "未找到匹配的笔记",
  emptyNotesLabel: "暂无笔记",
  noteCountSuffix: "篇",
}

export const editorConfig: EditorConfig = {
  editLabel: "编辑",
  previewLabel: "阅读",
  sourceLabel: "来源",
  deleteLabel: "删除",
  cancelLabel: "取消",
  titlePlaceholder: "笔记标题...",
  contentPlaceholder: "用 [[标题]] 创建笔记链接，支持 Markdown 语法...",
  outgoingLinksLabel: "提及:",
  incomingLinksLabel: "被引:",
}

export const graphConfig: GraphConfig = {
  notesLabel: "篇笔记",
  connectionsLabel: "条脉络",
  emptyGraphLabel: "暂无笔记，写下第一笔来开始",
  categoriesLabel: "个分类",
  uncategorizedLabel: "未分类",
  overviewHint: "点击分类展开其脉络",
  backToOverviewLabel: "全部",
}

export const moonConfig: MoonConfig = {
  phaseLabels: ["朔月", "眉月", "弦月", "盈月", "满月", "亏月", "弦月", "残月"],
}

export const appConfig: AppConfig = {
  emptyStateLabel: "选择一篇笔记开始阅读",
}

export type Locale = "zh" | "en";

/** Flat message dictionary. Keys map to [zh, en] pairs. */
export const messages = {
  appTitle: ["github热门项目", "githubPopularProjects"],
  appSubtitle: [
    "发现 GitHub 热门项目 — 浏览热门榜单，或按语言、Star、关键词搜索",
    "Discover trending GitHub repositories — browse trending lists or search by language, stars, and keywords",
  ],
  openOnGithub: ["在 GitHub 上查看", "View on GitHub"],
  footerLicense: [
    "基于 MIT 许可证开源 · 数据来自 GitHub",
    "Open source under the MIT License · Data from GitHub",
  ],
  contribute: ["在 GitHub 上参与贡献", "Contribute on GitHub"],

  // Mode tabs
  modeTrending: ["热门榜单", "Trending"],
  modeSearch: ["搜索", "Search"],

  // Trending filters
  sinceToday: ["今日", "Today"],
  sinceWeek: ["本周", "This week"],
  sinceMonth: ["本月", "This month"],
  filterLanguage: ["筛选语言", "Language"],

  // Search form
  searchKeyword: ["关键词", "Keyword"],
  searchKeywordPlaceholder: ["例如：机器学习、命令行工具、Web 框架", "e.g. machine learning, cli, web framework"],
  searchSort: ["排序", "Sort"],
  sortStars: ["综合推荐", "Best match"],
  sortForks: ["Fork 最多", "Most forks"],
  sortUpdated: ["最近更新", "Recently updated"],
  minStars: ["最低 Star", "Min stars"],
  searchSubmit: ["搜索", "Search"],

  // Results
  resultCountTrending: ["共 {n} 个热门仓库", "{n} trending repositories"],
  resultCountSearch: ["找到 {n} 个仓库", "{n} repositories found"],
  loadMore: ["加载更多 →", "Load more →"],
  prevPage: ["← 上一页", "← Previous page"],

  // States
  loading: ["加载中…", "Loading…"],
  empty: ["没有找到相关仓库，换个关键词或语言试试。", "No repositories found. Try a different keyword or language."],
  retry: ["重试", "Retry"],

  // Errors
  errorTitle: ["出错了", "Something went wrong"],

  // Language switch
  langSwitchAria: ["切换到英文", "Switch to Chinese"],
} as const;

export type MessageKey = keyof typeof messages;

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>
): string {
  const [zh, en] = messages[key];
  let str: string = locale === "zh" ? zh : en;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

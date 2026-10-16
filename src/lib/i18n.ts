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

  // Trending dimension tabs
  trendDaily: ["今日新增 Star", "Stars today"],
  trendWeekly: ["本周新增 Star", "Stars this week"],
  trendMonthly: ["本月新增 Star", "Stars this month"],
  trendTotal: ["总 Star", "Total stars"],
  trendTop: ["高星总榜", "All-time top"],
  dimensionLabel: ["榜单维度", "Ranking"],

  // Pagination / hint
  viewMore: ["查看更多", "View more"],
  loadingMore: ["加载中…", "Loading…"],
  noMoreHint: [
    "受限于当前榜单数据来源，暂无法加载更多。",
    "No more results available from the current data source.",
  ],
  trendingNote: [
    "榜单基于 GitHub 官方 Trending 页面。",
    "Rankings are based on GitHub's official Trending page.",
  ],
  trendingNoteTop: [
    "高星总榜基于 GitHub 全站仓库，按总 Star 排序。",
    "All-time top ranks every GitHub repository by total stars.",
  ],

  // Trending filters
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

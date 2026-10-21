/**
 * Bilingual function dictionary.
 *
 * GitHub's search data is overwhelmingly English, so Chinese functional
 * descriptions ("自动生成图片") match almost nothing on their own. This map
 * turns common Chinese needs into high-signal English search phrases.
 *
 * Ordering inside each value matters: the first phrases become the queries.
 * Keep entries focused on what people actually look for (a capability), not
 * on product names.
 */

export const FUNCTION_DICTIONARY: Record<string, string[]> = {
  // ---- Media / AI ----
  图片生成: ["image generation", "text to image", "stable diffusion"],
  生成图片: ["image generation", "text to image", "stable diffusion"],
  文生图: ["text to image", "image generation", "stable diffusion"],
  绘画: ["image generation", "stable diffusion", "ai art"],
  图片压缩: ["image compression", "image optimizer", "image compress"],
  图片处理: ["image processing", "image editor", "image manipulation"],
  图片编辑: ["image editor", "photo editor", "image editing"],
  视频生成: ["video generation", "text to video", "ai video"],
  视频剪辑: ["video editing", "video editor", "video processing"],
  语音合成: ["text to speech", "tts", "speech synthesis"],
  语音识别: ["speech recognition", "asr", "speech to text"],
  语音克隆: ["voice cloning", "voice clone", "tts"],
  字幕: ["subtitle", "subtitles", "captioning"],
  录屏: ["screen recording", "screen recorder", "capture"],
  截图: ["screenshot", "screen capture"],
  数字人: ["digital human", "avatar", "talking head"],

  // ---- UI components ----
  日期选择器: ["datepicker", "date picker", "calendar"],
  时间选择器: ["timepicker", "time picker", "date time picker"],
  表格: ["table", "datatable", "data grid"],
  拖拽: ["drag drop", "dnd", "sortable"],
  图表: ["chart", "graph", "visualization"],
  可视化: ["visualization", "charts", "dashboard"],
  富文本: ["rich text editor", "wysiwyg", "editor"],
  编辑器: ["editor", "code editor", "text editor"],
  上传: ["file upload", "upload", "file picker"],
  表单: ["form", "form validation", "form builder"],
  动画: ["animation", "motion", "transitions"],
  二维码: ["qrcode", "qr code", "qr generator"],
  地图: ["map", "maps", "mapping"],
  弹窗: ["modal", "dialog", "popup"],
  轮播: ["carousel", "slider", "swiper"],
  树形: ["tree view", "tree", "treeview"],
  级联: ["cascader", "cascade select", "tree select"],
  分页: ["pagination", "pager"],
  无限滚动: ["infinite scroll", "virtual list", "virtual scroll"],
  主题: ["theme", "dark mode", "theming"],

  // ---- Apps / self-hosted ----
  笔记: ["note taking", "notes", "note app"],
  待办: ["todo", "task management", "todo list"],
  任务管理: ["task management", "project management", "kanban"],
  博客: ["blog", "cms", "blogging"],
  网盘: ["cloud storage", "file storage", "file sharing"],
  相册: ["photo gallery", "photos", "photo management"],
  密码管理: ["password manager", "password", "secrets"],
  书签: ["bookmarks", "bookmark manager"],
  聊天: ["chat", "messaging", "instant messaging"],
  论坛: ["forum", "discussion", "community"],
  邮件: ["email", "smtp", "mail server"],
  日历: ["calendar", "scheduling", "events"],
  文档: ["documentation", "docs", "wiki"],
  知识库: ["knowledge base", "wiki", "documentation"],
  低代码: ["low-code", "no-code", "app builder"],
  工作流: ["workflow", "automation", "workflow engine"],
  自动化: ["automation", "automate", "workflow"],
  监控: ["monitoring", "observability", "metrics"],
  日志: ["logging", "logs", "log management"],
  备份: ["backup", "backups", "restore"],
  下载: ["downloader", "download", "download manager"],
  爬虫: ["crawler", "scraper", "spider"],
  搜索: ["search", "full text search", "search engine"],
  推荐: ["recommendation", "recommender", "recommendation system"],

  // ---- Backend / infra ----
  数据库: ["database", "db", "storage engine"],
  ORM: ["orm", "database orm", "query builder"],
  缓存: ["cache", "caching", "in-memory cache"],
  消息队列: ["message queue", "mq", "event streaming"],
  定时任务: ["cron", "scheduler", "job queue"],
  认证: ["authentication", "auth", "login"],
  登录: ["login", "authentication", "oauth"],
  权限: ["authorization", "rbac", "permissions"],
  支付: ["payment", "payments", "stripe"],
  部署: ["deployment", "devops", "deploy"],
  容器: ["docker", "container", "kubernetes"],
  反向代理: ["reverse proxy", "proxy", "gateway"],
  网关: ["api gateway", "gateway", "proxy"],
  接口文档: ["api documentation", "openapi", "swagger"],
  接口测试: ["api testing", "http client", "api client"],
  测试: ["testing", "test framework", "test runner"],
  命令行: ["cli", "command line", "command-line tool"],
  终端: ["terminal", "tui", "shell"],

  // ---- AI / data ----
  机器学习: ["machine learning", "ml", "deep learning"],
  大模型: ["llm", "large language model", "language model"],
  智能体: ["ai agent", "agent", "agents"],
  向量数据库: ["vector database", "vector search", "embeddings"],
  知识图谱: ["knowledge graph", "graph database", "kg"],
  数据可视化: ["data visualization", "charts", "dashboard"],
  数据处理: ["data processing", "etl", "data pipeline"],
  数据分析: ["data analysis", "analytics", "data science"],
  文档转换: ["document conversion", "pdf conversion", "file conversion"],
  PDF: ["pdf", "pdf generation", "pdf parser"],
  简历: ["resume", "cv", "resume builder"],
  游戏: ["game", "game engine", "gamedev"],
  "3D": ["3d", "threejs", "webgl"],
};

/** Split "owner / repo" style input is not needed here; this only expands needs. */

export type NeedExpansion = {
  /** English phrases to search for (highest signal first). */
  terms: string[];
  /** Terms grouped per matched Chinese concept, in match order. */
  groups: string[][];
  /** Chinese dictionary keys that matched the input. */
  matched: string[];
};

/**
 * Expand a user's functional description into English search terms.
 * Chinese keys are matched longest-first so "日期选择器" wins over "日期".
 * English words already present in the input are kept as terms too.
 */
export function expandNeed(input: string): NeedExpansion {
  const text = input.toLowerCase();
  const matched: string[] = [];
  const terms: string[] = [];
  const groups: string[][] = [];

  const keys = Object.keys(FUNCTION_DICTIONARY).sort(
    (a, b) => b.length - a.length
  );
  for (const key of keys) {
    if (text.includes(key.toLowerCase())) {
      matched.push(key);
      const group = FUNCTION_DICTIONARY[key];
      groups.push(group);
      for (const term of group) {
        if (!terms.includes(term)) terms.push(term);
      }
    }
  }

  // Keep any English words the user typed (e.g. "image generation").
  const english = input.match(/[a-zA-Z][a-zA-Z0-9+#.-]{1,}/g) ?? [];
  for (const word of english) {
    const w = word.toLowerCase();
    if (!terms.includes(w)) terms.push(w);
  }

  if (terms.length === 0) terms.push(input.trim());
  return { terms, groups, matched };
}

/**
 * Pick up to `max` terms, preferring ones that share no words with those
 * already picked. Keeps a 2-query budget from spending both slots on near
 * duplicates like "image compression" / "image compress".
 */
function pickDiverse(terms: string[], max: number): string[] {
  if (terms.length <= max) return [...terms];
  const words = (s: string) => new Set(s.toLowerCase().split(/\s+/).filter(Boolean));
  const picked: string[] = [terms[0]];
  while (picked.length < max) {
    let best: string | null = null;
    let bestOverlap = Infinity;
    for (const term of terms) {
      if (picked.includes(term)) continue;
      const tw = words(term);
      let overlap = 0;
      for (const p of picked) {
        for (const w of words(p)) if (tw.has(w)) overlap++;
      }
      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        best = term;
      }
    }
    if (!best) break;
    picked.push(best);
  }
  return picked;
}

/**
 * Build GitHub queries from the expanded concepts.
 *
 * With several concepts ("拖拽排序表格" = table + drag), one query combines
 * them ("table drag drop") and the others fall back to each concept alone,
 * so no part of the need is silently dropped.
 */
export function buildQueries(
  groups: string[][],
  fallbackTerms: string[],
  max = 3
): string[] {
  const out: string[] = [];

  if (groups.length >= 2) {
    const combined = groups.map((g) => g[0]).filter(Boolean).join(" ");
    if (combined) out.push(combined);
    for (const group of groups) {
      if (out.length >= max) break;
      const first = group[0];
      if (first && !out.includes(first)) out.push(first);
    }
    return out.slice(0, max);
  }

  const source = groups.length === 1 ? groups[0] : fallbackTerms;
  return pickDiverse(source, max);
}

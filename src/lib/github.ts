import * as cheerio from "cheerio";
import { cacheGet, cacheSet } from "./cache";
import { checkOutboundUrl } from "./ssrf";
import type {
  ApiResult,
  Repository,
  SearchQuery,
  SearchSort,
  TrendingSince,
} from "./types";

const GITHUB_API = "https://api.github.com";
const GITHUB_TRENDING = "https://github.com/trending";

function githubToken(): string | undefined {
  const token = process.env.GITHUB_TOKEN;
  return token && token.length > 0 ? token : undefined;
}

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "githubPopularProjects/1.0",
  };
  const token = githubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Map a raw GitHub search API item to our Repository shape. */
function mapSearchItem(item: Record<string, unknown>): Repository {
  const owner = (item.owner ?? {}) as Record<string, unknown>;
  const license = (item.license ?? null) as { spdx_id?: string } | null;
  return {
    id: item.id as number,
    name: (item.name as string) ?? "",
    fullName: (item.full_name as string) ?? "",
    owner: (owner.login as string) ?? "",
    ownerAvatar: (owner.avatar_url as string) ?? "",
    description: (item.description as string | null) ?? null,
    url: (item.html_url as string) ?? "",
    stars: (item.stargazers_count as number) ?? 0,
    forks: (item.forks_count as number) ?? 0,
    openIssues: (item.open_issues_count as number) ?? 0,
    watchers: (item.watchers_count as number) ?? 0,
    language: (item.language as string | null) ?? null,
    topics: (item.topics as string[]) ?? [],
    license: license?.spdx_id ?? null,
    createdAt: (item.created_at as string) ?? "",
    updatedAt: (item.updated_at as string) ?? "",
    pushedAt: (item.pushed_at as string) ?? "",
    starsToday: null,
    starsSince: null,
  };
}

function parseStars(value: string): number {
  const n = parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Trending is approximated via the Search API when the official trending page
 * is unreachable. GitHub's own trending ranks by recent star velocity, which
 * the Search API cannot express directly, so we approximate with two signals:
 *   - "recently created + already popular" (freshest notable projects), and
 *   - "actively pushed + established" (active popular projects).
 * Combined and de-duplicated, ordered by stars.
 */
async function fetchTrendingViaSearch(
  since: TrendingSince,
  language?: string
): Promise<Repository[]> {
  const days = since === "daily" ? 7 : since === "weekly" ? 30 : 90;
  const sinceDate = new Date(Date.now() - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const langQ =
    language && language !== "All languages" ? `language:${language} ` : "";

  const queries = [
    // Notable projects created recently.
    `${langQ}created:>${sinceDate} stars:>50`,
    // Established, actively-maintained projects.
    `${langQ}pushed:>${sinceDate} stars:>500`,
  ];

  const results = await Promise.all(
    queries.map(async (q) => {
      const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(
        q
      )}&sort=stars&order=desc&per_page=30`;
      const res = await fetch(url, { headers: apiHeaders() });
      if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
      const json = (await res.json()) as { items?: Record<string, unknown>[] };
      return (json.items ?? []).map(mapSearchItem);
    })
  );

  // De-duplicate by full name, keep first occurrence, order by stars desc.
  const seen = new Set<string>();
  const merged: Repository[] = [];
  for (const list of results) {
    for (const repo of list) {
      if (seen.has(repo.fullName)) continue;
      seen.add(repo.fullName);
      merged.push(repo);
    }
  }
  merged.sort((a, b) => b.stars - a.stars);
  return merged.slice(0, 30);
}

/**
 * Fetch trending repositories.
 *
 * Primary source is the official github.com/trending page (parsed with cheerio),
 * which is what "trending" actually means and carries the "stars today/this
 * week/this month" badge. When that page is unreachable — restricted networks,
 * firewalls, or github.com blocked while api.github.com is reachable — we fall
 * back to approximating trending via the GitHub Search API.
 */
export async function fetchTrending(
  since: TrendingSince,
  language?: string
): Promise<ApiResult<{ items: Repository[] }>> {
  const lang = language && language !== "All languages" ? language : "";
  const pageUrl = `${GITHUB_TRENDING}${lang ? `/${encodeURIComponent(lang)}` : ""}?since=${since}`;

  const cacheKey = `trending:${pageUrl}`;
  const cached = cacheGet<{ items: Repository[] }>(cacheKey);
  if (cached) return { ok: true, data: cached };

  const guard = checkOutboundUrl(pageUrl);
  if (!guard.ok) {
    return { ok: false, error: guard.reason, status: 400 };
  }

  // 1) Try the official trending page.
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; githubPopularProjects/1.0; +https://github.com/MagicSquarekey/githubPopularProjects)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const html = await res.text();
      const items = parseTrendingHtml(html, since);
      if (items.length > 0) {
        const data = { items };
        cacheSet(cacheKey, data, 30 * 60 * 1000);
        return { ok: true, data };
      }
    }
  } catch {
    // fall through to Search API approximation
  }

  // 2) Fall back to Search API approximation.
  try {
    const items = await fetchTrendingViaSearch(since, lang || undefined);
    const data = { items };
    cacheSet(cacheKey, data, 30 * 60 * 1000);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to load trending: ${(err as Error).message}`,
      status: 502,
    };
  }
}

/**
 * Search repositories via GitHub Search API.
 */
export async function searchRepositories(
  query: SearchQuery
): Promise<ApiResult<{ items: Repository[]; total: number }>> {
  const parts: string[] = [];
  if (query.q && query.q.trim()) parts.push(query.q.trim());
  if (query.language && query.language !== "All languages") {
    parts.push(`language:${query.language}`);
  }
  if (query.minStars && query.minStars > 0) {
    parts.push(`stars:>=${Math.floor(query.minStars)}`);
  }
  if (parts.length === 0) parts.push("stars:>10000");

  const sort: SearchSort = query.sort ?? "stars";
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const perPage = 30;
  const q = parts.join(" ");
  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(
    q
  )}&sort=${sort}&order=desc&page=${page}&per_page=${perPage}`;

  const cacheKey = `search:${url}`;
  const cached = cacheGet<{ items: Repository[]; total: number }>(cacheKey);
  if (cached) return { ok: true, data: cached };

  const guard = checkOutboundUrl(url);
  if (!guard.ok) {
    return { ok: false, error: guard.reason, status: 400 };
  }

  try {
    const res = await fetch(url, { headers: apiHeaders() });
    if (res.status === 403 || res.status === 429) {
      return {
        ok: false,
        error:
          "GitHub rate limit reached. Add a GITHUB_TOKEN env var to raise it.",
        status: 429,
      };
    }
    if (!res.ok) {
      return { ok: false, error: `GitHub API error ${res.status}`, status: res.status };
    }
    const json = (await res.json()) as {
      items?: Record<string, unknown>[];
      total_count?: number;
    };
    const items = (json.items ?? []).map(mapSearchItem);
    const data = { items, total: json.total_count ?? items.length };
    cacheSet(cacheKey, data, 5 * 60 * 1000);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to reach GitHub: ${(err as Error).message}`,
      status: 502,
    };
  }
}

/** Split "owner / repo" and keep the owner login. */
function splitFullName(fullName: string): { owner: string; name: string } {
  const [owner = "", name = ""] = fullName.split("/");
  return { owner, name };
}

function parseTrendingHtml(html: string, since: TrendingSince): Repository[] {
  const $ = cheerio.load(html);
  const repos: Repository[] = [];
  let idCounter = 0;

  $("article.Box-row").each((_, el) => {
    const article = $(el);
    const anchor = article.find("h2 a").first();
    const href = anchor.attr("href") ?? "";
    const fullName = href.replace(/^\//, "").trim();
    if (!fullName.includes("/")) return;
    const { owner, name } = splitFullName(fullName);

    const description = article.find("p").first().text().trim() || null;
    const langEl = article.find('[itemprop="programmingLanguage"]').first();
    const language = langEl.text().trim() || null;

    const starText = article
      .find('a[href$="/stargazers"]')
      .first()
      .text()
      .trim();
    const stars = parseStars(starText);

    const forkText = article
      .find('a[href$="/forks"]')
      .first()
      .text()
      .trim();
    const forks = parseStars(forkText);

    // "X stars today" / "this week" / "this month" badge.
    const badgeText = article.find(".float-sm-right").first().text().trim();
    const badgeMatch = badgeText.match(/([\d,]+)\s+stars/i);
    const starsSince = badgeMatch ? parseStars(badgeMatch[1]) : null;

    const topics: string[] = [];
    article.find('a[href^="/topics/"]').each((_, t) => {
      const topic = $(t).text().trim();
      if (topic && !topics.includes(topic)) topics.push(topic);
    });

    const avatar = `https://github.com/${owner}.png?size=48`;

    repos.push({
      id: --idCounter,
      name,
      fullName,
      owner,
      ownerAvatar: avatar,
      description,
      url: `https://github.com/${fullName}`,
      stars,
      forks,
      openIssues: 0,
      watchers: 0,
      language,
      topics,
      license: null,
      createdAt: "",
      updatedAt: "",
      pushedAt: "",
      starsToday: since === "daily" ? starsSince : null,
      starsSince,
    });
  });

  return repos;
}

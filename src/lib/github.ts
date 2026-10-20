import * as cheerio from "cheerio";
import { cacheGet, cacheSet } from "./cache";
import { checkOutboundUrl } from "./ssrf";
import type {
  ApiResult,
  Repository,
  SearchQuery,
  SearchSort,
  TrendingSortKey,
} from "./types";

const GITHUB_API = "https://api.github.com";
const GITHUB_TRENDING = "https://github.com/trending";

/** The three time windows on GitHub's trending page. */
type TrendingSince = "daily" | "weekly" | "monthly";

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
    starsInPeriod: { daily: null, weekly: null, monthly: null },
  };
}

function parseStars(value: string): number {
  const n = parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Parse a trending page for one time window into a list of repos. */
function parseTrendingPage(
  html: string,
  since: TrendingSince
): Repository[] {
  const $ = cheerio.load(html);
  const repos: Repository[] = [];
  let idCounter = 0;

  $("article.Box-row").each((_, el) => {
    const article = $(el);
    const anchor = article.find("h2 a").first();
    const href = anchor.attr("href") ?? "";
    const fullName = href.replace(/^\//, "").trim();
    if (!fullName.includes("/")) return;
    const [owner = "", name = ""] = fullName.split("/");

    const description = article.find("p").first().text().trim() || null;
    const language = article
      .find('[itemprop="programmingLanguage"]')
      .first()
      .text()
      .trim() || null;

    const stars = parseStars(
      article.find('a[href$="/stargazers"]').first().text().trim()
    );
    const forks = parseStars(
      article.find('a[href$="/forks"]').first().text().trim()
    );

    // The right-hand badge: "X stars today / this week / this month".
    const badgeText = article.find(".float-sm-right").first().text().trim();
    const badgeMatch = badgeText.match(/([\d,]+)\s+stars/i);
    const starsSince = badgeMatch ? parseStars(badgeMatch[1]) : null;

    const topics: string[] = [];
    article.find('a[href^="/topics/"]').each((_, t) => {
      const topic = $(t).text().trim();
      if (topic && !topics.includes(topic)) topics.push(topic);
    });

    repos.push({
      id: --idCounter,
      name,
      fullName,
      owner,
      ownerAvatar: `https://github.com/${owner}.png?size=48`,
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
      starsInPeriod: { daily: null, weekly: null, monthly: null, [since]: starsSince },
    });
  });

  return repos;
}

/** Merge by owner/name, taking the max of each numeric field. */
function mergeRepos(lists: Repository[][]): Repository[] {
  const byKey = new Map<string, Repository>();
  for (const list of lists) {
    for (const r of list) {
      const key = r.fullName;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...r, starsInPeriod: { ...r.starsInPeriod } });
        continue;
      }
      existing.stars = Math.max(existing.stars, r.stars);
      existing.forks = Math.max(existing.forks, r.forks);
      existing.starsInPeriod.daily = maxNull(existing.starsInPeriod.daily, r.starsInPeriod.daily);
      existing.starsInPeriod.weekly = maxNull(existing.starsInPeriod.weekly, r.starsInPeriod.weekly);
      existing.starsInPeriod.monthly = maxNull(existing.starsInPeriod.monthly, r.starsInPeriod.monthly);
      // Fill in richer metadata if the current copy is missing it.
      if (!existing.description && r.description) existing.description = r.description;
      if (!existing.language && r.language) existing.language = r.language;
      if (existing.topics.length === 0 && r.topics.length) existing.topics = r.topics;
    }
  }
  return [...byKey.values()];
}

function maxNull(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

async function fetchTrendingPage(
  since: TrendingSince,
  language: string
): Promise<Repository[] | null> {
  const langPath = language ? `/${encodeURIComponent(language)}` : "";
  const url = `${GITHUB_TRENDING}${langPath}?since=${since}`;
  const guard = checkOutboundUrl(url);
  if (!guard.ok) return null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; githubPopularProjects/1.0; +https://github.com/MagicSquarekey/githubPopularProjects)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseTrendingPage(html, since);
  } catch {
    return null;
  }
}

/**
 * Fetch trending from all three windows (daily/weekly/monthly), merge, and
 * return the unified list. The list is then sorted by the caller per metric.
 * Falls back to a Search-API approximation only if the official page is
 * unreachable for every window.
 */
async function fetchUnifiedTrending(
  language: string
): Promise<Repository[]> {
  const cacheKey = `trending:unified:${language}`;
  const cached = cacheGet<Repository[]>(cacheKey);
  if (cached) return cached;

  const [daily, weekly, monthly] = await Promise.all([
    fetchTrendingPage("daily", language),
    fetchTrendingPage("weekly", language),
    fetchTrendingPage("monthly", language),
  ]);

  // If nothing came back, approximate via the Search API.
  if (!daily && !weekly && !monthly) {
    const approx = await fetchTrendingViaSearch("daily", language || undefined);
    cacheSet(cacheKey, approx, 30 * 60 * 1000);
    return approx;
  }

  const merged = mergeRepos([daily ?? [], weekly ?? [], monthly ?? []]);
  cacheSet(cacheKey, merged, 30 * 60 * 1000);
  return merged;
}

/** Per-page size for the "top stars" Search-API ranking. */
const TOP_PAGE_SIZE = 30;

/**
 * "High-star total ranking" via the GitHub Search API. Covers the whole of
 * GitHub (not just the trending page), so mature high-star repos like n8n
 * show up. Ordered by total stars, supports language filter and paging.
 */
export async function fetchTopStars(
  language: string,
  page: number
): Promise<ApiResult<{ items: Repository[]; total: number }>> {
  const langQ = language ? `language:${language} ` : "";
  const q = `${langQ}stars:>1`;
  const safePage = Math.max(1, Math.floor(page));
  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(
    q
  )}&sort=stars&order=desc&page=${safePage}&per_page=${TOP_PAGE_SIZE}`;

  const cacheKey = `top:${url}`;
  const cached = cacheGet<{ items: Repository[]; total: number }>(cacheKey);
  if (cached) return { ok: true, data: cached };

  const guard = checkOutboundUrl(url);
  if (!guard.ok) return { ok: false, error: guard.reason, status: 400 };

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
    cacheSet(cacheKey, data, 30 * 60 * 1000);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to reach GitHub: ${(err as Error).message}`,
      status: 502,
    };
  }
}

/** Return trending repositories sorted by the requested metric.
 *   daily/weekly/monthly -> rank by stars gained in that window
 *   total               -> rank by total stars (within trending scope)
 *   top                 -> high-star total ranking across all of GitHub
 */
export async function fetchTrending(
  sort: TrendingSortKey,
  language?: string,
  page = 1
): Promise<ApiResult<{ items: Repository[]; total?: number }>> {
  if (sort === "top") {
    const lang = language && language !== "All languages" ? language : "";
    return fetchTopStars(lang, page);
  }

  const lang = language && language !== "All languages" ? language : "";
  const items = await fetchUnifiedTrending(lang);
  if (items.length === 0) {
    return {
      ok: false,
      error: "Failed to load trending",
      status: 502,
    };
  }
  const sorted = [...items].sort((a, b) => {
    const av = a.starsInPeriod[sort] ?? -1;
    const bv = b.starsInPeriod[sort] ?? -1;
    if (bv !== av) return bv - av;
    return b.stars - a.stars;
  });

  // A repo only carries the increment for the window whose page it appeared
  // on, so keep only repos that have real data for the requested window.
  // Every card in the list then shows its matching "stars gained" badge.
  // (Fall back to the merged list if the filter would empty it — e.g. that
  // window's page failed while another succeeded.)
  const filtered = sorted.filter((r) => (r.starsInPeriod[sort] ?? 0) > 0);
  return { ok: true, data: { items: filtered.length > 0 ? filtered : sorted } };
}

/**
 * Approximate trending via the Search API when the official page is
 * unreachable. Combines recently-created notable projects with actively
 * maintained established ones, de-duplicated and sorted by stars.
 */
async function fetchTrendingViaSearch(
  since: TrendingSince,
  language?: string
): Promise<Repository[]> {
  const days = since === "daily" ? 7 : since === "weekly" ? 30 : 90;
  const sinceDate = new Date(Date.now() - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const langQ = language ? `language:${language} ` : "";

  const queries = [
    `${langQ}created:>${sinceDate} stars:>50`,
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
      return (json.items ?? []).map((item) => {
        const r = mapSearchItem(item);
        r.starsInPeriod = { daily: null, weekly: null, monthly: null };
        return r;
      });
    })
  );

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

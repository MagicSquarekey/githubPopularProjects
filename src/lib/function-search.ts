import { cacheGet, cacheSet } from "./cache";
import { buildQueries, expandNeed } from "./function-dictionary";
import { apiHeaders, mapSearchItem } from "./github";
import {
  classifyRepo,
  deployHint,
  installHint,
  maintenanceStatus,
} from "./repo-kind";
import { checkOutboundUrl } from "./ssrf";
import type { ApiResult, RepoKind, Repository } from "./types";

const GITHUB_API = "https://api.github.com";
const PER_QUERY = 20;
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Anonymous GitHub search allows 10 requests/minute, so a 3-query search
 * only fits ~3 searches/min. With a token (30/min) we can afford 3 queries;
 * without one, 2 keeps the app usable.
 */
function maxQueries(): number {
  return process.env.GITHUB_TOKEN ? 3 : 2;
}

export type FindParams = {
  need: string;
  kind?: "all" | RepoKind;
  language?: string;
  minStars?: number;
};

export type FindResult = {
  items: Repository[];
  /** English phrases actually queried (shown to the user for transparency). */
  expandedTerms: string[];
  /** Chinese dictionary entries that matched the need. */
  matched: string[];
};

/** Names/descriptions that indicate a list, tutorial or course, not a tool. */
const EXCLUDE_PATTERNS = [
  /awesome/i,
  /roadmap/i,
  /interview/i,
  /tutorial/i,
  /cheatsheet|cheat-sheet/i,
  /free-programming-books/i,
  /\bcourse\b/i,
  /learning-resources/i,
];

function isNoise(repo: Repository): boolean {
  if (repo.archived) return true;
  const haystack = `${repo.fullName} ${repo.description ?? ""}`;
  return EXCLUDE_PATTERNS.some((re) => re.test(haystack));
}

function relevanceScore(repo: Repository, terms: string[]): number {
  const name = repo.fullName.toLowerCase();
  const desc = (repo.description ?? "").toLowerCase();
  const topics = repo.topics.map((t) => t.toLowerCase());

  let score = 0;
  for (const raw of terms) {
    const phrase = raw.toLowerCase();
    // A full phrase hit is much stronger than scattered single words.
    if (name.includes(phrase)) score += 40;
    if (desc.includes(phrase)) score += 30;

    // Score on individual words so "image generation" matches either word.
    const words = phrase.split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (name.includes(w)) score += 30;
      if (desc.includes(w)) score += 15;
      if (topics.some((t) => t.includes(w))) score += 20;
    }
  }

  // Popularity: log-scaled so a 100k-star irrelevant repo can't dominate.
  score += Math.log10(repo.stars + 1) * 8;

  // Activity and trust signals.
  const days = (Date.now() - Date.parse(repo.pushedAt)) / 86_400_000;
  if (Number.isFinite(days)) {
    if (days <= 30) score += 15;
    else if (days <= 365) score += 5;
    else score -= 10;
  }
  if (repo.license) score += 3;

  return score;
}

/**
 * Resolve the real npm package name from the repo's package.json.
 * Repo names are often not the package name (TanStack/table → @tanstack/...),
 * so a wrong install command is worse than none. Monorepo roots marked
 * `private: true` yield null.
 */
async function resolveNpmName(repo: Repository): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${repo.fullName}/HEAD/package.json`;
  const guard = checkOutboundUrl(url);
  if (!guard.ok) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { name?: string; private?: boolean };
    if (json.private) return null;
    return typeof json.name === "string" && json.name.length > 0
      ? json.name
      : null;
  } catch {
    return null;
  }
}

async function searchOne(
  query: string,
  language: string | undefined,
  minStars: number
): Promise<Repository[]> {
  let q = query;
  if (language && language !== "All languages") q += ` language:${language}`;
  if (minStars && minStars > 0) q += ` stars:>=${Math.floor(minStars)}`;

  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(
    q
  )}&sort=stars&order=desc&per_page=${PER_QUERY}`;

  const guard = checkOutboundUrl(url);
  if (!guard.ok) throw new Error(guard.reason);

  const res = await fetch(url, { headers: apiHeaders() });
  if (res.status === 403 || res.status === 429) {
    throw new Error("rate_limited");
  }
  if (!res.ok) throw new Error(`api_error:${res.status}`);
  const json = (await res.json()) as { items?: Record<string, unknown>[] };
  return (json.items ?? []).map(mapSearchItem);
}

/**
 * Functional discovery: turn a need ("自动生成图片") into several English
 * queries, merge results, drop list/tutorial noise, then rank by
 * relevance + popularity + activity. Returns mixed project kinds on purpose.
 */
export async function findProjects(
  params: FindParams
): Promise<ApiResult<FindResult>> {
  const need = params.need.trim();
  const kindFilter = params.kind ?? "all";
  const language = params.language ?? "All languages";
  const minStars = Math.min(Math.max(params.minStars ?? 0, 0), 1_000_000);

  const cacheKey = `find:${need}|${kindFilter}|${language}|${minStars}`;
  const cached = cacheGet<FindResult>(cacheKey);
  if (cached) return { ok: true, data: cached };

  const { terms, groups, matched } = expandNeed(need);
  const queries = buildQueries(groups, terms, maxQueries());

  let lists: Repository[][];
  try {
    lists = await Promise.all(
      queries.map((q) => searchOne(q, language, minStars))
    );
  } catch (err) {
    const message = (err as Error).message;
    if (message === "rate_limited") {
      return {
        ok: false,
        error:
          "GitHub rate limit reached. Add a GITHUB_TOKEN env var to raise it.",
        status: 429,
      };
    }
    if (message.startsWith("api_error:")) {
      return {
        ok: false,
        error: `GitHub API error ${message.split(":")[1]}`,
        status: Number(message.split(":")[1]) || 502,
      };
    }
    return {
      ok: false,
      error: `Failed to reach GitHub: ${message}`,
      status: 502,
    };
  }

  // Merge + dedupe by full name.
  const byName = new Map<string, Repository>();
  for (const list of lists) {
    for (const repo of list) {
      if (!byName.has(repo.fullName)) byName.set(repo.fullName, repo);
    }
  }

  // Enrich, filter, then rank.
  const enriched: Repository[] = [];
  for (const repo of byName.values()) {
    if (isNoise(repo)) continue;
    const kind = classifyRepo(repo);
    if (kindFilter !== "all" && kind !== kindFilter) continue;
    repo.kind = kind;
    repo.installCommand = installHint(repo, kind);
    repo.deployHint = deployHint(repo, kind);
    repo.maintenance = maintenanceStatus(repo.pushedAt);
    repo.relevanceScore = relevanceScore(repo, terms);
    enriched.push(repo);
  }

  enriched.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

  // Verify npm package names for the visible top results so the install
  // command is accurate; drop it when the repo is a private monorepo root.
  const top = enriched.slice(0, 12);
  await Promise.all(
    top.map(async (repo) => {
      if (!repo.installCommand?.startsWith("npm i")) return;
      if (repo.language !== "TypeScript" && repo.language !== "JavaScript") return;
      const pkg = await resolveNpmName(repo);
      repo.installCommand = pkg
        ? repo.installCommand.startsWith("npm i -g")
          ? `npm i -g ${pkg}`
          : `npm i ${pkg}`
        : null;
    })
  );

  const data: FindResult = {
    items: enriched,
    expandedTerms: queries,
    matched,
  };
  cacheSet(cacheKey, data, CACHE_TTL);
  return { ok: true, data };
}

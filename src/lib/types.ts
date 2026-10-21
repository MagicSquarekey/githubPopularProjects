export type StarPeriod = {
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
};

/** Inferred project shape, used by the functional search. */
export type RepoKind =
  | "library"
  | "application"
  | "cli"
  | "plugin"
  | "template"
  | "framework"
  | "unknown";

export type Maintenance = "active" | "moderate" | "stale";

export type Repository = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerAvatar: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  language: string | null;
  topics: string[];
  license: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  archived?: boolean;
  // Stars gained in each trending window (null when not present in that window).
  starsInPeriod: StarPeriod;
  // Functional-search enrichment (absent for trending results).
  kind?: RepoKind;
  installCommand?: string | null;
  deployHint?: string | null;
  maintenance?: Maintenance;
  relevanceScore?: number;
};

export type TrendingSortKey = "daily" | "weekly" | "monthly" | "top";

export type SearchSort = "stars" | "forks" | "updated";

export type SearchQuery = {
  q?: string;
  language?: string;
  sort?: SearchSort;
  minStars?: number;
  page?: number;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

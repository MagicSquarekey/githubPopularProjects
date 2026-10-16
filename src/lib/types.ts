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
  // Trending-specific fields (null for search results)
  starsToday: number | null;
  starsSince: number | null;
};

export type TrendingSince = "daily" | "weekly" | "monthly";

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

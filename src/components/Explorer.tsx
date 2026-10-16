"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { SkeletonGrid } from "@/components/Skeleton";
import { useLocale } from "@/components/LocaleProvider";
import { LANGUAGES } from "@/lib/languages";
import type {
  Repository,
  SearchSort,
  TrendingSortKey,
} from "@/lib/types";

type Mode = "trending" | "search";

const TREND_DIMS: { value: TrendingSortKey; key: "trendDaily" | "trendWeekly" | "trendMonthly" | "trendTop" }[] = [
  { value: "daily", key: "trendDaily" },
  { value: "weekly", key: "trendWeekly" },
  { value: "monthly", key: "trendMonthly" },
  { value: "top", key: "trendTop" },
];

const SORT_OPTIONS: { value: SearchSort; key: "sortStars" | "sortForks" | "sortUpdated" }[] = [
  { value: "stars", key: "sortStars" },
  { value: "forks", key: "sortForks" },
  { value: "updated", key: "sortUpdated" },
];

const PAGE_SIZE = 12;

const selectClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

/** Localize the error message from the API using its errorCode. */
function useLocalizedError() {
  const { t, locale } = useLocale();
  return useCallback(
    (payload: { error?: string; errorCode?: string; status?: number }) => {
      if (payload.errorCode === "rate_limited") {
        return locale === "zh"
          ? "GitHub 请求频率已达上限。请设置 GITHUB_TOKEN 环境变量以提升限额。"
          : "GitHub rate limit reached. Add a GITHUB_TOKEN env var to raise it.";
      }
      if (payload.errorCode === "upstream_unreachable") {
        return locale === "zh"
          ? "暂时无法连接 GitHub，请稍后重试。"
          : "Could not reach GitHub. Please try again later.";
      }
      if (payload.error) return payload.error;
      return t("errorTitle");
    },
    [locale, t]
  );
}

export function Explorer() {
  const { t, locale } = useLocale();
  const localizeError = useLocalizedError();
  const [mode, setMode] = useState<Mode>("trending");

  // Trending state
  const [dimension, setDimension] = useState<TrendingSortKey>("daily");
  const [trendingLang, setTrendingLang] = useState("All languages");
  const [allItems, setAllItems] = useState<Repository[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [trendingTotal, setTrendingTotal] = useState<number | null>(null);

  // Search state
  const [keyword, setKeyword] = useState("");
  const [searchLang, setSearchLang] = useState("All languages");
  const [sort, setSort] = useState<SearchSort>("stars");
  const [minStars, setMinStars] = useState("");
  const [searchPage, setSearchPage] = useState(1);

  // Shared state
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [searchItems, setSearchItems] = useState<Repository[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // Trending: fetch the unified list whenever dimension or language changes.
  const loadTrending = useCallback(
    async (page = 1, append = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const url = `/api/trending?sort=${dimension}&language=${encodeURIComponent(
          trendingLang
        )}${dimension === "top" ? `&page=${page}` : ""}`;
        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) {
          setError(localizeError(json));
          if (!append) setAllItems([]);
          return;
        }
        const items: Repository[] = json.items ?? [];
        setTrendingTotal(json.total ?? null);
        setAllItems((prev) => (append ? [...prev, ...items] : items));
        setVisible(PAGE_SIZE);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        if (!append) setAllItems([]);
      } finally {
        append ? setLoadingMore(false) : setLoading(false);
      }
    },
    [dimension, trendingLang, localizeError]
  );

  useEffect(() => {
    if (mode === "trending") loadTrending(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dimension, trendingLang]);

  const loadSearch = useCallback(
    async (page: number, append: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (keyword.trim()) params.set("q", keyword.trim());
        params.set("language", searchLang);
        params.set("sort", sort);
        if (minStars) params.set("minStars", minStars);
        params.set("page", String(page));
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) {
          setError(localizeError(json));
          if (!append) setSearchItems([]);
          return;
        }
        const items: Repository[] = json.items ?? [];
        setTotal(json.total ?? null);
        setSearchItems((prev) => (append ? [...prev, ...items] : items));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        if (!append) setSearchItems([]);
      } finally {
        append ? setLoadingMore(false) : setLoading(false);
      }
    },
    [keyword, searchLang, sort, minStars, localizeError]
  );

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchPage(1);
    loadSearch(1, false);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next === "search" && searchItems.length === 0) {
      setSearchLang(trendingLang === "All languages" ? "All languages" : trendingLang);
    }
  };

  // For the official trending dimensions, allItems is the full merged list
  // and we page it client-side. For "top" (高星总榜), the API pages itself,
  // so allItems already holds exactly what's been fetched.
  const isTop = dimension === "top";
  const trendingItems = isTop ? allItems : allItems.slice(0, visible);
  const trendingHasMore = isTop
    ? trendingTotal !== null && allItems.length < trendingTotal
    : visible < allItems.length;
  const items = mode === "trending" ? trendingItems : searchItems;

  const searchHasMore =
    mode === "search" && searchItems.length > 0 && (total === null || searchItems.length < total);

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    }`;

  const dimClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    }`;

  const labelClass = "mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400";

  return (
    <div>
      {/* Mode tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
        <button type="button" onClick={() => switchMode("trending")} className={tabClass(mode === "trending")}>
          {t("modeTrending")}
        </button>
        <button type="button" onClick={() => switchMode("search")} className={tabClass(mode === "search")}>
          {t("modeSearch")}
        </button>
      </div>

      {mode === "trending" ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
            {TREND_DIMS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDimension(d.value)}
                className={dimClass(dimension === d.value)}
              >
                {t(d.key)}
              </button>
            ))}
          </div>
          <select
            value={trendingLang}
            onChange={(e) => setTrendingLang(e.target.value)}
            className={selectClass}
            aria-label={t("filterLanguage")}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang === "All languages" ? (locale === "zh" ? "全部语言" : "All languages") : lang}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <form onSubmit={onSubmitSearch} className="mb-6 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className={labelClass}>{t("searchKeyword")}</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("searchKeywordPlaceholder")}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className={labelClass}>{t("filterLanguage")}</label>
            <select value={searchLang} onChange={(e) => setSearchLang(e.target.value)} className={selectClass}>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang === "All languages" ? (locale === "zh" ? "全部语言" : "All languages") : lang}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("searchSort")}</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as SearchSort)} className={selectClass}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.key)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("minStars")}</label>
            <input
              type="number"
              min={0}
              value={minStars}
              onChange={(e) => setMinStars(e.target.value)}
              placeholder="0"
              className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            {t("searchSubmit")}
          </button>
        </form>
      )}

      {/* Results */}
      {loading ? (
        <SkeletonGrid count={12} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => (mode === "trending" ? loadTrending() : loadSearch(1, false))}
            className="mt-3 rounded-lg border border-red-300 px-4 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
          >
            {t("retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {mode === "search" && total !== null
                ? t("resultCountSearch", { n: total.toLocaleString() })
                : t("resultCountTrending", { n: allItems.length })}
            </span>
            {mode === "trending" && (
              <span>{isTop ? t("trendingNoteTop") : t("trendingNote")}</span>
            )}
          </div>

          <div className="grid animate-fade-in grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((repo, idx) => (
              <ProjectCard
                key={`${repo.fullName}-${idx}`}
                repo={repo}
                rank={idx + 1}
                trendingSort={mode === "trending" ? dimension : undefined}
              />
            ))}
          </div>

          {/* View more (trending). "top" pages the API; the official
              dimensions reveal more of the already-fetched list. */}
          {mode === "trending" && trendingHasMore && (
            <div className="mt-6 flex flex-col items-center gap-2">
              {loadingMore ? (
                <span className="text-sm text-gray-500 dark:text-gray-400">{t("loadingMore")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    isTop
                      ? loadTrending(Math.floor(allItems.length / 30) + 1, true)
                      : setVisible((v) => v + PAGE_SIZE)
                  }
                  className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("viewMore")}
                </button>
              )}
            </div>
          )}
          {mode === "trending" && !trendingHasMore && !isTop && allItems.length > PAGE_SIZE && (
            <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
              {t("noMoreHint")}
            </div>
          )}

          {/* View more (search) */}
          {mode === "search" && (
            <div className="mt-6 flex flex-col items-center gap-2">
              {loadingMore ? (
                <span className="text-sm text-gray-500 dark:text-gray-400">{t("loadingMore")}</span>
              ) : searchHasMore ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = searchPage + 1;
                    setSearchPage(next);
                    loadSearch(next, true);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("viewMore")}
                </button>
              ) : searchItems.length > 0 ? (
                <span className="text-xs text-gray-400 dark:text-gray-500">{t("noMoreHint")}</span>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

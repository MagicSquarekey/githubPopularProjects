"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { SkeletonGrid } from "@/components/Skeleton";
import { useLocale } from "@/components/LocaleProvider";
import { LANGUAGES } from "@/lib/languages";
import type { Repository, SearchSort, TrendingSince } from "@/lib/types";

type Mode = "trending" | "search";

const SINCE_OPTIONS: { value: TrendingSince; key: "sinceToday" | "sinceWeek" | "sinceMonth" }[] = [
  { value: "daily", key: "sinceToday" },
  { value: "weekly", key: "sinceWeek" },
  { value: "monthly", key: "sinceMonth" },
];

const SORT_OPTIONS: { value: SearchSort; key: "sortStars" | "sortForks" | "sortUpdated" }[] = [
  { value: "stars", key: "sortStars" },
  { value: "forks", key: "sortForks" },
  { value: "updated", key: "sortUpdated" },
];

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
  const [since, setSince] = useState<TrendingSince>("daily");
  const [trendingLang, setTrendingLang] = useState("All languages");

  // Search state
  const [keyword, setKeyword] = useState("");
  const [searchLang, setSearchLang] = useState("All languages");
  const [sort, setSort] = useState<SearchSort>("stars");
  const [minStars, setMinStars] = useState("");

  // Shared state
  const [items, setItems] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      let url: string;
      if (mode === "trending") {
        url = `/api/trending?since=${since}&language=${encodeURIComponent(trendingLang)}`;
      } else {
        const params = new URLSearchParams();
        if (keyword.trim()) params.set("q", keyword.trim());
        params.set("language", searchLang);
        params.set("sort", sort);
        if (minStars) params.set("minStars", minStars);
        params.set("page", String(page));
        url = `/api/search?${params.toString()}`;
      }
      const res = await fetch(url, { signal: controller.signal });
      const json = await res.json();
      if (!res.ok) {
        setError(localizeError(json));
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
      setTotal(json.total ?? null);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mode, since, trendingLang, keyword, searchLang, sort, minStars, page, localizeError]);

  // Auto-load on filter change (trending) — immediate.
  useEffect(() => {
    if (mode === "trending") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, since, trendingLang]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next === "search" && items.length === 0) {
      setSearchLang(trendingLang === "All languages" ? "All languages" : trendingLang);
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
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
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
            {SINCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSince(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  since === opt.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {t(opt.key)}
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
        <SkeletonGrid count={mode === "trending" ? 12 : 9} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={load}
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
          <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {mode === "search" && total !== null
              ? t("resultCountSearch", { n: total.toLocaleString() })
              : t("resultCountTrending", { n: items.length })}
          </div>
          <div className="grid animate-fade-in grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((repo, idx) => (
              <ProjectCard
                key={`${repo.fullName}-${idx}`}
                repo={repo}
                rank={mode === "trending" ? idx + 1 : undefined}
              />
            ))}
          </div>

          {mode === "search" && page > 1 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t("prevPage")}
              </button>
            </div>
          )}
          {mode === "search" && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

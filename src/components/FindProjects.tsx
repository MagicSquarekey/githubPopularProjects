"use client";

import { useCallback, useRef, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { SkeletonGrid } from "@/components/Skeleton";
import { useLocale } from "@/components/LocaleProvider";
import { LANGUAGES } from "@/lib/languages";
import type { MessageKey } from "@/lib/i18n";
import type { RepoKind, Repository } from "@/lib/types";

const PAGE_SIZE = 12;

const KIND_OPTIONS: { value: "all" | RepoKind; key: MessageKey }[] = [
  { value: "all", key: "findTypeAll" },
  { value: "library", key: "kindLibrary" },
  { value: "application", key: "kindApplication" },
  { value: "cli", key: "kindCli" },
  { value: "plugin", key: "kindPlugin" },
  { value: "template", key: "kindTemplate" },
  { value: "framework", key: "kindFramework" },
];

const selectClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

export function FindProjects() {
  const { t, locale } = useLocale();
  const [need, setNeed] = useState("");
  const [kind, setKind] = useState<"all" | RepoKind>("all");
  const [language, setLanguage] = useState("All languages");
  const [minStars, setMinStars] = useState("");

  const [items, setItems] = useState<Repository[]>([]);
  const [expandedTerms, setExpandedTerms] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const q = need.trim();
      if (!q) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const params = new URLSearchParams({ need: q });
        if (kind !== "all") params.set("kind", kind);
        if (language !== "All languages") params.set("language", language);
        if (minStars) params.set("minStars", minStars);
        const res = await fetch(`/api/components?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) {
          if (json.errorCode === "rate_limited") {
            setError(
              locale === "zh"
                ? "GitHub 请求频率已达上限，请稍后重试或配置 GITHUB_TOKEN。"
                : "GitHub rate limit reached. Retry later or set GITHUB_TOKEN."
            );
          } else {
            setError(json.error ?? `Request failed (${res.status})`);
          }
          setItems([]);
          return;
        }
        setItems(json.items ?? []);
        setExpandedTerms(json.expandedTerms ?? []);
        setVisible(PAGE_SIZE);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [need, kind, language, minStars, locale]
  );

  const shown = items.slice(0, visible);
  const hasMore = visible < items.length;
  const labelClass =
    "mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400";

  return (
    <div>
      <form onSubmit={run} className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label className={labelClass}>{t("searchKeyword")}</label>
          <input
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder={t("findPlaceholder")}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className={labelClass}>{t("findType")}</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "all" | RepoKind)}
            className={selectClass}
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.key)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t("filterLanguage")}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={selectClass}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang === "All languages"
                  ? locale === "zh"
                    ? "全部语言"
                    : "All languages"
                  : lang}
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
          {t("findSubmit")}
        </button>
      </form>

      {!searched && (
        <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
          {t("findHint")}
        </p>
      )}

      {loading ? (
        <SkeletonGrid count={9} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => run()}
            className="mt-3 rounded-lg border border-red-300 px-4 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
          >
            {t("retry")}
          </button>
        </div>
      ) : searched && items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("findEmpty")}</p>
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {t("resultCountSearch", { n: items.length.toLocaleString() })}
            </span>
            {expandedTerms.length > 0 && (
              <span className="flex flex-wrap items-center gap-1.5">
                {t("findMatched")}:
                {expandedTerms.map((term) => (
                  <span
                    key={term}
                    className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {term}
                  </span>
                ))}
              </span>
            )}
          </div>

          <div className="grid animate-fade-in grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((repo, idx) => (
              <ProjectCard key={`${repo.fullName}-${idx}`} repo={repo} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {t("viewMore")}
              </button>
            </div>
          )}
          {!hasMore && items.length > PAGE_SIZE && (
            <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
              {t("noMoreHint")}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

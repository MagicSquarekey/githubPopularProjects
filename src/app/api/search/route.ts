import { NextResponse } from "next/server";
import { searchRepositories } from "@/lib/github";
import type { SearchSort } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const language = searchParams.get("language") ?? "All languages";
  const sortParam = searchParams.get("sort") ?? "stars";
  const minStars = Number(searchParams.get("minStars") ?? 0) || 0;
  const page = Number(searchParams.get("page") ?? 1) || 1;

  const allowedSorts: SearchSort[] = ["stars", "forks", "updated"];
  const sort = (allowedSorts.includes(sortParam as SearchSort)
    ? sortParam
    : "stars") as SearchSort;

  const result = await searchRepositories({
    q,
    language,
    sort,
    minStars: Math.min(Math.max(minStars, 0), 1_000_000),
    page: Math.min(Math.max(page, 1), 100),
  });

  if (!result.ok) {
    const errorCode =
      result.status === 429
        ? "rate_limited"
        : result.status === 502
          ? "upstream_unreachable"
          : "unknown";
    return NextResponse.json(
      { error: result.error, errorCode },
      { status: result.status }
    );
  }
  return NextResponse.json(
    { items: result.data.items, total: result.data.total },
    { headers: { "Cache-Control": "public, max-age=120" } }
  );
}

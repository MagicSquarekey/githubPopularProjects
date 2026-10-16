import { NextResponse } from "next/server";
import { fetchTrending } from "@/lib/github";
import type { TrendingSortKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortParam = searchParams.get("sort") ?? "daily";
  const language = searchParams.get("language") ?? "All languages";
  const page = Number(searchParams.get("page") ?? 1) || 1;

  const allowed: TrendingSortKey[] = ["daily", "weekly", "monthly", "total", "top"];
  const sort = (allowed.includes(sortParam as TrendingSortKey)
    ? sortParam
    : "daily") as TrendingSortKey;

  const result = await fetchTrending(sort, language, Math.min(Math.max(page, 1), 100));
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
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}

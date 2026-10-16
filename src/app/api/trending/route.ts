import { NextResponse } from "next/server";
import { fetchTrending } from "@/lib/github";
import type { TrendingSince } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since") ?? "daily";
  const language = searchParams.get("language") ?? "All languages";

  const allowed: TrendingSince[] = ["daily", "weekly", "monthly"];
  const since = (allowed.includes(sinceParam as TrendingSince)
    ? sinceParam
    : "daily") as TrendingSince;

  const result = await fetchTrending(since, language);
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
    { items: result.data.items },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}

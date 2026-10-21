import { NextResponse } from "next/server";
import { findProjects } from "@/lib/function-search";
import type { RepoKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: ("all" | RepoKind)[] = [
  "all",
  "library",
  "application",
  "cli",
  "plugin",
  "template",
  "framework",
  "unknown",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const need = (searchParams.get("need") ?? "").trim();
  if (!need) {
    return NextResponse.json(
      { error: "need is required", errorCode: "bad_request" },
      { status: 400 }
    );
  }
  if (need.length > 200) {
    return NextResponse.json(
      { error: "need is too long", errorCode: "bad_request" },
      { status: 400 }
    );
  }

  const kindParam = (searchParams.get("kind") ?? "all") as "all" | RepoKind;
  const kind = KINDS.includes(kindParam) ? kindParam : "all";
  const language = searchParams.get("language") ?? "All languages";
  const minStars = Number(searchParams.get("minStars") ?? 0) || 0;

  const result = await findProjects({ need, kind, language, minStars });
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
    {
      items: result.data.items,
      expandedTerms: result.data.expandedTerms,
      matched: result.data.matched,
    },
    { headers: { "Cache-Control": "public, max-age=600" } }
  );
}

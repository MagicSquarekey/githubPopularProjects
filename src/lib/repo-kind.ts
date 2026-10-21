import type { Maintenance, RepoKind, Repository } from "./types";

/**
 * Infer what kind of project a repository is (library, app, CLI, ...).
 *
 * Heuristic only: scores topic/description/name signals per kind and takes
 * the highest. Topics are the strongest signal because maintainers curate
 * them; descriptions are next. The result is shown as a badge, never used
 * to hide results (mixed-type ranking is intentional).
 */

const SIGNALS: Record<Exclude<RepoKind, "unknown">, string[]> = {
  application: [
    "self-hosted",
    "selfhosted",
    "web-app",
    "webui",
    "web-ui",
    "gui",
    "desktop-app",
    "desktop",
    "studio",
    "client",
    "application",
    "platform",
    "service",
    "saas",
    "low-code",
    "no-code",
    "management-system",
    "photo-gallery",
    "note-taking",
    "cms",
    "e-commerce",
    "workflow-automation",
    "dashboard",
  ],
  library: [
    "component",
    "components",
    "ui-library",
    "sdk",
    "widget",
    "package",
    "library",
    "toolkit",
    "api-wrapper",
    "react-component",
    "vue-component",
    "ui-components",
    "headless",
  ],
  cli: ["cli", "command-line", "command-line-tool", "terminal", "shell", "tui"],
  plugin: ["plugin", "extension", "addon", "vscode-extension"],
  template: ["template", "boilerplate", "starter", "scaffold"],
  framework: ["framework", "meta-framework"],
};

const KIND_PRIORITY: RepoKind[] = [
  "framework",
  "application",
  "library",
  "cli",
  "plugin",
  "template",
];

export function classifyRepo(repo: Repository): RepoKind {
  const name = repo.fullName.toLowerCase();
  const desc = (repo.description ?? "").toLowerCase();
  const topics = repo.topics.map((t) => t.toLowerCase());

  const scores = new Map<RepoKind, number>();
  for (const [kind, signals] of Object.entries(SIGNALS) as [
    Exclude<RepoKind, "unknown">,
    string[],
  ][]) {
    let score = 0;
    for (const sig of signals) {
      if (topics.includes(sig)) score += 3;
      else if (topics.some((t) => t.includes(sig))) score += 2;
      if (desc.includes(sig)) score += 4;
      if (name.includes(sig)) score += 2;
    }
    scores.set(kind, score);
  }

  let best: RepoKind = "unknown";
  let bestScore = 0;
  for (const kind of KIND_PRIORITY) {
    const score = scores.get(kind) ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = kind;
    }
  }
  return bestScore >= 2 ? best : "unknown";
}

/** Install / run hint appropriate to the kind and language. */
export function installHint(
  repo: Repository,
  kind: RepoKind
): string | null {
  const name = repo.name;
  const lang = repo.language;

  if (kind === "library") {
    switch (lang) {
      case "TypeScript":
      case "JavaScript":
        return `npm i ${name}`;
      case "Python":
        return `pip install ${name}`;
      case "Go":
        return `go get ${repo.fullName}`;
      case "Rust":
        return `cargo add ${name}`;
      case "PHP":
        return `composer require ${repo.fullName}`;
      case "Ruby":
        return `gem install ${name}`;
      default:
        return null;
    }
  }

  if (kind === "cli") {
    switch (lang) {
      case "Rust":
        return `cargo install ${name}`;
      case "Go":
        return `go install ${repo.fullName}@latest`;
      case "TypeScript":
      case "JavaScript":
        return `npm i -g ${name}`;
      case "Python":
        return `pip install ${name}`;
      default:
        return null;
    }
  }

  return null;
}

/** Deploy hint for self-hostable applications. */
export function deployHint(repo: Repository, kind: RepoKind): string | null {
  if (kind !== "application") return null;
  const topics = repo.topics.map((t) => t.toLowerCase());
  if (
    topics.some((t) =>
      ["self-hosted", "selfhosted", "docker", "docker-compose"].includes(t)
    )
  ) {
    return "self-hosted";
  }
  return null;
}

/** Maintenance status from the last push date. */
export function maintenanceStatus(pushedAt: string): Maintenance {
  const t = Date.parse(pushedAt);
  if (!Number.isFinite(t)) return "moderate";
  const days = (Date.now() - t) / 86_400_000;
  if (days <= 30) return "active";
  if (days <= 365) return "moderate";
  return "stale";
}

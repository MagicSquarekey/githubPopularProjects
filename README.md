# githubPopularProjects

An open-source site to discover trending GitHub repositories. Browse official
trending lists (today / this week / this month, filterable by language) or
search repositories by keyword, language, sort order, and minimum stars.

Built with **Next.js 15 + TypeScript + Tailwind CSS**. Runs anywhere Node or
Docker runs — locally on your machine or on any server — and works in any
modern browser on Windows, macOS, or Linux.

## Features

- **Trending lists** — today / this week / this month, filterable by 20+ languages
- **Search** — keyword, language, sort (best match / forks / recently updated), minimum stars
- **Rich project cards** — owner, description, stars, forks, language, topics, license, "stars today" badge
- **Dark / light theme** with system-preference detection
- **Server-side caching** to stay well within GitHub's rate limits
- **Optional token support** to raise the GitHub API rate limit

## Quick start (local development)

Requires [Node.js](https://nodejs.org/) 20+.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open http://localhost:3000
```

## Production build (local / server, without Docker)

```bash
npm ci
npm run build
npm start            # serves on http://localhost:3000
```

Set the port with `PORT=8080 npm start` if 3000 is taken.

## Docker (recommended for servers)

Requires [Docker](https://www.docker.com/) and Docker Compose.

```bash
# Build and run (maps port 3000)
docker compose up -d --build

# Open http://localhost:3000
```

Or without Compose:

```bash
docker build -t github-popular-projects .
docker run -p 3000:3000 -e GITHUB_TOKEN=ghp_optional_token github-popular-projects
```

## Configuration

Copy `.env.example` to `.env.local` for optional settings:

| Variable       | Required | Description                                             |
| -------------- | -------- | ------------------------------------------------------- |
| `GITHUB_TOKEN` | No       | Personal access token to raise GitHub API rate limits.  |
| `PORT`         | No       | Port for the production server (default `3000`).        |

Without a `GITHUB_TOKEN`, the app still works for light personal use; GitHub
limits anonymous search to 10 requests/minute, mitigated by the built-in cache.

## Project structure

```
src/
  app/
    page.tsx            Home page (tabs, filters, grid)
    layout.tsx          Root layout + metadata
    globals.css         Tailwind + base styles
    api/
      trending/route.ts GET /api/trending?since=&language=
      search/route.ts   GET /api/search?q=&language=&sort=&minStars=&page=
  components/
    Explorer.tsx        Mode tabs, filters, search form, results grid
    ProjectCard.tsx     Single repository card
    Skeleton.tsx        Loading skeletons
    ThemeProvider.tsx   Dark/light theme context
    ThemeToggle.tsx     Theme switch button
  lib/
    github.ts           Data layer: GitHub Search + Trending (cheerio)
    ssrf.ts             Outbound-URL guard (blocks private/loopback hosts)
    cache.ts            In-memory TTL cache
    languages.ts        Language list + GitHub Linguist colors
    types.ts            Shared TypeScript types
```

## Deploying elsewhere

Because the app builds to a standalone Next.js server, it deploys to any host
that runs Node or Docker — VPS, AWS, Fly.io, Railway, a home server, etc. It
does not require any database.

## Security notes

- Outbound requests are restricted to `http/https` and validated against
  localhost, loopback, private, and reserved address ranges before any fetch,
  preventing server-side request forgery via user-influenced query parameters.
- Your `GITHUB_TOKEN`, if provided, stays server-side and is never exposed to
  the browser.

## Contributing

Contributions are welcome! Please open an issue or pull request on
[GitHub](https://github.com/MagicSquarekey/githubPopularProjects).

## License

[MIT](./LICENSE) © githubPopularProjects contributors

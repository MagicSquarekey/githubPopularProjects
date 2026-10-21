# github热门项目

一个开源的 GitHub 热门项目发现站点。浏览官方热门榜单（今日 / 本周 / 本月，可按语言筛选），或按关键词、语言、排序、最低 Star 数搜索仓库。

基于 **Next.js 15 + TypeScript + Tailwind CSS** 构建。只要有 Node.js 或 Docker 就能运行 —— 本地电脑或任意服务器都可以 —— 并且能在任何现代浏览器（Windows / macOS / Linux）中访问。

**🌐 语言 / Languages：** [中文](#github热门项目)（当前） · [English](#english) · [日本語](#日本語) · [한국어](#한국어) · [Français](#français) · [Deutsch](#deutsch) · [Español](#español) · [Português](#português) · [Русский](#русский)

---

## ✨ 功能特性

- **热门榜单** — 今日 / 本周 / 本月新增 Star，官方 Trending 口径，支持 20+ 种语言筛选
- **高星总榜** — 覆盖全站仓库按总 Star 排序
- **按功能找项目** — 用中文描述需求（如「自动生成图片」「拖拽排序表格」），自动转英文检索，返回库 / 完整应用 / CLI 等各类项目
- **搜索** — 关键词、语言、排序（综合推荐 / Fork 最多 / 最近更新）、最低 Star 数
- **丰富的项目卡片** — 作者、描述、Star、Fork、主语言、话题标签、开源协议、新增 Star 徽标、项目类型、安装命令、维护状态
- **深色 / 浅色主题**，跟随系统偏好自动切换
- **中文 / English 界面**，默认中文，右上角可切换，选择会保存在浏览器
- **服务端缓存**，有效控制在 GitHub 频率限制内
- **可选 Token 支持**，提升 GitHub API 频率上限

---

## 🔎 按功能找项目

在「找项目」标签页输入一句中文需求即可：

| 输入 | 自动扩展为 | 结果示例 |
|------|-----------|---------|
| 自动生成图片 | image generation / text to image / stable diffusion | Stable Diffusion WebUI（完整应用）、diffusers（库） |
| 拖拽排序表格 | table drag drop / table / drag drop | Vue.Draggable、handsontable、dnd-kit |
| 图片压缩 | image compression / image optimizer | browser-image-compression、caesium |

处理流程：

1. **中英功能词典**：中文需求 → 多个英文检索词（GitHub 数据以英文为主，直接搜中文几乎无结果）
2. **多查询并行合并**：一次检索 2~3 个查询，按仓库去重
3. **质量过滤**：自动排除 awesome 清单、教程、课程、已归档仓库
4. **相关性 + 高星排序**：关键词命中权重优先，叠加 Star 数、活跃度、许可证
5. **类型识别**：根据 topics / 描述推断「库 / 完整应用 / CLI / 插件 / 模板 / 框架」，可筛选
6. **卡片增强**：库显示安装命令（从 package.json 校验真实包名）、自托管应用显示部署提示、所有项目显示维护状态

> 💡 **建议配置 `GITHUB_TOKEN`**：匿名搜索限额为 10 次/分钟，配置后提升到 30 次/分钟，按功能搜索体验会稳定很多。见下方配置说明。

---

## 🚀 一键启动（Windows）

仓库根目录提供了 **`start.bat`**，双击即可运行：

- 自动检查 Node.js（未安装会提示前往官网下载）
- 首次运行自动安装依赖（`npm install`）
- 自动打开浏览器访问 http://localhost:3000
- 默认以生产模式启动，失败时自动回退到开发模式

> 生产模式需先构建一次。若尚未构建，可先在项目目录执行 `npm run build`，或直接双击 `start.bat`（它会自动回退到开发模式，功能一致）。

---

## 🛠 本地开发

需要 [Node.js](https://nodejs.org/) 20 及以上版本。

```bash
# 1. 安装依赖  (Install dependencies)
npm install

# 2. 启动开发服务器  (Start the dev server)
npm run dev

# 3. 打开 http://localhost:3000
```

---

## 📦 生产构建（本地 / 服务器，不用 Docker）

```bash
npm ci
npm run build
npm start            # 监听 http://localhost:3000  (serves on port 3000)
```

如果 3000 端口被占用，可用 `PORT=8080 npm start` 指定端口。

---

## 🐳 Docker（推荐用于服务器）

需要 [Docker](https://www.docker.com/) 与 Docker Compose。

```bash
# 构建并运行（映射 3000 端口）
docker compose up -d --build

# 打开 http://localhost:3000
```

或不用 Compose：

```bash
docker build -t github-popular-projects .
docker run -p 3000:3000 -e GITHUB_TOKEN=ghp_可选token github-popular-projects
```

---

## ⚙️ 配置

把 `.env.example` 复制为 `.env.local` 可做可选设置：

| 变量           | 是否必填 | 说明                                       |
| -------------- | -------- | ------------------------------------------ |
| `GITHUB_TOKEN` | 否（强烈建议） | 个人访问令牌。匿名搜索限额 10 次/分钟，配置后 30 次/分钟；「按功能找项目」会一次发多个查询，建议配置 |
| `PORT`         | 否       | 生产服务器端口（默认 `3000`）              |
| `HTTPS_PROXY`  | 否       | 服务端出站代理。github.com 需代理才能访问的网络环境（如国内本地运行）时设置为 `http://127.0.0.1:7890` 一类的本地代理地址；海外服务器留空即直连 |

不设置 `GITHUB_TOKEN` 也能正常使用；此时 GitHub 匿名搜索限制为每分钟 10 次，已由内置缓存缓解。

---

## 🗂 项目结构

```
src/
  app/
    page.tsx            主页（标签切换、筛选、结果网格）
    layout.tsx          根布局 + 页面元信息
    globals.css         Tailwind + 基础样式
    api/
      trending/route.ts GET /api/trending?sort=&language=&page=
      search/route.ts   GET /api/search?q=&language=&sort=&minStars=&page=
      components/route.ts GET /api/components?need=&kind=&language=&minStars=
  components/
    Explorer.tsx        模式标签、榜单筛选、搜索表单、结果网格
    FindProjects.tsx    按功能找项目（需求输入、类型筛选、结果）
    ProjectCard.tsx     单个仓库卡片（含类型/安装命令/维护状态）
    Skeleton.tsx        加载骨架屏
    ThemeProvider.tsx   深色/浅色主题上下文
    ThemeToggle.tsx     主题切换按钮
    LocaleProvider.tsx  中文/英文语言上下文
    LocaleToggle.tsx    语言切换按钮
  lib/
    github.ts           数据层：GitHub Search + Trending（cheerio 解析）
    function-dictionary.ts 中英功能词典（需求 → 英文检索词）
    function-search.ts  按功能检索：多查询合并、过滤、相关性排序
    repo-kind.ts        项目类型识别、安装/部署提示、维护状态
    ssrf.ts             出站请求防护（拦截内网/环回等私有地址）
    cache.ts            内存 TTL 缓存
    languages.ts        语言列表 + GitHub Linguist 语言配色
    i18n.ts             中英文案字典与翻译函数
    types.ts            共享 TypeScript 类型
```

---

## 🌍 部署到其它平台

由于本应用构建为独立的 Next.js 服务器，可部署到任何支持 Node 或 Docker 的主机 —— VPS、AWS、Fly.io、Railway、家庭服务器等。无需任何数据库。

---

## 🔒 安全说明

- 出站请求仅允许 `http/https`，并在请求前校验并拒绝 localhost、环回、私有及保留地址段，防止通过用户可控参数发起服务端请求伪造（SSRF）。
- 若设置了 `GITHUB_TOKEN`，它只保存在服务端，不会暴露给浏览器。

---

## 🤝 参与贡献

欢迎贡献！请在 [GitHub](https://github.com/MagicSquarekey/githubPopularProjects) 上提交 Issue 或 Pull Request。

---

## 📄 许可证

[MIT](./LICENSE) © github热门项目 贡献者

---

<a id="english"></a>

## English

> This section is the English translation of the documentation above.

# githubPopularProjects

An open-source site to discover trending GitHub repositories. Browse official trending lists (today / this week / this month, filterable by language) or search repositories by keyword, language, sort order, and minimum stars.

Built with **Next.js 15 + TypeScript + Tailwind CSS**. Runs anywhere Node or Docker runs — locally on your machine or on any server — and works in any modern browser on Windows, macOS, or Linux.

### Features

- **Trending lists** — stars gained today / this week / this month (official Trending scope), filterable by 20+ languages
- **All-time top** — every GitHub repo ranked by total stars
- **Find projects by need** — describe what you need in Chinese or English; queries are translated and expanded automatically, returning libraries, apps, CLIs and more
- **Search** — keyword, language, sort (best match / forks / recently updated), minimum stars
- **Rich project cards** — owner, description, stars, forks, language, topics, license, stars-gained badge, project kind, install command, maintenance status
- **Dark / light theme** with system-preference detection
- **Chinese / English UI**, Chinese by default, toggle in the top-right
- **Server-side caching** to stay within GitHub rate limits
- **Optional token support** to raise the GitHub API rate limit

### Quick start (Windows)

Double-click **`start.bat`** in the repo root: it checks Node.js, installs dependencies on first run, opens http://localhost:3000, and starts the production server (falling back to dev mode).

### Local development

Requires [Node.js](https://nodejs.org/) 20+.

```bash
npm install       # Install dependencies
npm run dev       # Start the dev server
# Open http://localhost:3000
```

### Production build

```bash
npm ci
npm run build
npm start         # Serves on http://localhost:3000
```

### Docker

```bash
docker compose up -d --build
# Open http://localhost:3000
```

### Configuration

Copy `.env.example` to `.env.local`. Optional: `GITHUB_TOKEN` (raises API rate limit), `PORT` (default `3000`).

### License

[MIT](./LICENSE) © githubPopularProjects contributors

---

<a id="日本語"></a>

## 日本語

> このセクションは上記ドキュメントの日本語訳です。

# githubPopularProjects（GitHub 人気プロジェクト）

GitHub のトレンドリポジトリを発見するオープンソースのサイトです。公式トレンド（今日 / 今週 / 今月、言語で絞り込み可）や、キーワード・言語・並び順・最小スター数での検索ができます。

**Next.js 15 + TypeScript + Tailwind CSS** で構築。Node.js または Docker が動く環境ならどこでも実行でき、Windows / macOS / Linux のモダンブラウザで利用できます。

### 主な機能

- **トレンド** — 今日 / 今週 / 今月、20 以上の言語で絞り込み
- **検索** — キーワード、言語、並び順（おすすめ / Fork 数 / 最近更新）、最小スター数
- **充実したプロジェクトカード** — 作者、説明、スター、Fork、言語、トピック、ライセンス、「本日のスター」バッジ
- **ダーク / ライトテーマ**（システム設定に追従）
- **中国語 / 英語 UI**（デフォルトは中国語、右上で切替）
- **サーバー側キャッシュ**で GitHub のレート制限を抑制
- 任意で `GITHUB_TOKEN` を設定してレート制限を緩和

### クイックスタート（Windows）

リポジトリ直下の **`start.bat`** をダブルクリック：Node.js を確認し、初回は依存関係をインストールし、http://localhost:3000 を開きます。

### ローカル開発

[Node.js](https://nodejs.org/) 20 以上が必要です。

```bash
npm install       # 依存関係のインストール
npm run dev       # 開発サーバー起動
# http://localhost:3000 を開く
```

### 本番ビルド

```bash
npm ci
npm run build
npm start         # http://localhost:3000 で配信
```

### ライセンス

[MIT](./LICENSE) © githubPopularProjects コントリビューター

---

<a id="한국어"></a>

## 한국어

> 이 섹션은 위 문서의 한국어 번역입니다.

# githubPopularProjects (GitHub 인기 프로젝트)

GitHub 트렌딩 저장소를 발견하는 오픈소스 사이트입니다. 공식 트렌딩(오늘 / 이번 주 / 이번 달, 언어별 필터 가능)을 둘러보거나 키워드·언어·정렬·최소 스타 수로 검색할 수 있습니다.

**Next.js 15 + TypeScript + Tailwind CSS**로 제작. Node.js 또는 Docker가 실행되는 곳이면 어디서든 동작하며, Windows / macOS / Linux의 최신 브라우저에서 사용할 수 있습니다.

### 주요 기능

- **트렌딩** — 오늘 / 이번 주 / 이번 달, 20개 이상 언어 필터
- **검색** — 키워드, 언어, 정렬(추천 / Fork 수 / 최근 업데이트), 최소 스타 수
- **풍부한 프로젝트 카드** — 소유자, 설명, 스타, Fork, 언어, 토픽, 라이선스, "오늘의 스타" 배지
- **다크 / 라이트 테마**(시스템 설정 따름)
- **중국어 / 영어 UI**(기본 중국어, 오른쪽 상단에서 전환)
- **서버 측 캐시**로 GitHub 레이트 리밋 완화
- 선택적으로 `GITHUB_TOKEN` 설정으로 레이트 리밋 완화

### 빠른 시작 (Windows)

저장소 루트의 **`start.bat`**을 더블클릭: Node.js를 확인하고, 처음 실행 시 의존성을 설치하며, http://localhost:3000 을 엽니다.

### 로컬 개발

[Node.js](https://nodejs.org/) 20 이상이 필요합니다.

```bash
npm install       # 의존성 설치
npm run dev       # 개발 서버 실행
# http://localhost:3000 열기
```

### 프로덕션 빌드

```bash
npm ci
npm run build
npm start         # http://localhost:3000 에서 제공
```

### 라이선스

[MIT](./LICENSE) © githubPopularProjects 기여자

---

<a id="français"></a>

## Français

> Cette section est la traduction française de la documentation ci-dessus.

# githubPopularProjects (Projets populaires GitHub)

Un site open source pour découvrir les dépôts GitHub tendance. Parcourez les tendances officielles (aujourd'hui / cette semaine / ce mois, filtrables par langue) ou recherchez par mot-clé, langue, tri et nombre minimum d'étoiles.

Construit avec **Next.js 15 + TypeScript + Tailwind CSS**. Fonctionne partout où Node ou Docker tourne — en local ou sur n'importe quel serveur — et dans tout navigateur moderne (Windows / macOS / Linux).

### Fonctionnalités

- **Tendances** — aujourd'hui / cette semaine / ce mois, filtrables par 20+ langages
- **Recherche** — mot-clé, langage, tri (pertinence / forks / récemment mises à jour), étoiles minimales
- **Fiches riches** — propriétaire, description, étoiles, forks, langage, topics, licence, badge « étoiles aujourd'hui »
- **Thème sombre / clair** selon les préférences système
- **Interface chinois / anglais**, chinois par défaut
- **Cache côté serveur** pour respecter les limites de taux GitHub
- Jeton `GITHUB_TOKEN` optionnel pour augmenter la limite

### Démarrage rapide (Windows)

Double-cliquez sur **`start.bat`** à la racine : il vérifie Node.js, installe les dépendances au premier lancement et ouvre http://localhost:3000.

### Développement local

Nécessite [Node.js](https://nodejs.org/) 20+.

```bash
npm install       # Installer les dépendances
npm run dev       # Démarrer le serveur de dev
# Ouvrir http://localhost:3000
```

### Build de production

```bash
npm ci
npm run build
npm start         # Sert sur http://localhost:3000
```

### Licence

[MIT](./LICENSE) © Contributeurs githubPopularProjects

---

<a id="deutsch"></a>

## Deutsch

> Dieser Abschnitt ist die deutsche Übersetzung der obigen Dokumentation.

# githubPopularProjects (Beliebte GitHub-Projekte)

Eine Open-Source-Website zum Entdecken von angesagten GitHub-Repositories. Durchsuchen Sie die offiziellen Trends (heute / diese Woche / diesen Monat, nach Sprache filterbar) oder suchen Sie nach Stichwort, Sprache, Sortierung und Mindest-Sternen.

Gebaut mit **Next.js 15 + TypeScript + Tailwind CSS**. Läuft überall, wo Node oder Docker läuft — lokal oder auf jedem Server — und in jedem modernen Browser (Windows / macOS / Linux).

### Funktionen

- **Trends** — heute / diese Woche / diesen Monat, filterbar nach 20+ Sprachen
- **Suche** — Stichwort, Sprache, Sortierung (Beste Treffer / Forks / Kürzlich aktualisiert), Mindest-Sterne
- **Umfangreiche Karten** — Besitzer, Beschreibung, Sterne, Forks, Sprache, Topics, Lizenz, „Sterne heute"-Badge
- **Dunkles / helles Design** passend zu den Systemeinstellungen
- **Chinesische / englische Oberfläche**, standardmäßig Chinesisch
- **Server-seitiger Cache** zur Einhaltung der GitHub-Ratenlimits
- Optionales `GITHUB_TOKEN` zur Erhöhung des Limits

### Schnellstart (Windows)

Doppelklicken Sie auf **`start.bat`** im Repo-Stamm: prüft Node.js, installiert beim ersten Start Abhängigkeiten und öffnet http://localhost:3000.

### Lokale Entwicklung

Erfordert [Node.js](https://nodejs.org/) 20+.

```bash
npm install       # Abhängigkeiten installieren
npm run dev       # Dev-Server starten
# http://localhost:3000 öffnen
```

### Produktions-Build

```bash
npm ci
npm run build
npm start         # Liefert auf http://localhost:3000
```

### Lizenz

[MIT](./LICENSE) © githubPopularProjects Mitwirkende

---

<a id="español"></a>

## Español

> Esta sección es la traducción al español de la documentación anterior.

# githubPopularProjects (Proyectos populares de GitHub)

Un sitio de código abierto para descubrir repositorios tendencia de GitHub. Explora las tendencias oficiales (hoy / esta semana / este mes, filtrables por lenguaje) o busca por palabra clave, lenguaje, orden y estrellas mínimas.

Construido con **Next.js 15 + TypeScript + Tailwind CSS**. Funciona donde sea que corra Node o Docker — localmente o en cualquier servidor — y en cualquier navegador moderno (Windows / macOS / Linux).

### Características

- **Tendencias** — hoy / esta semana / este mes, filtrables por 20+ lenguajes
- **Búsqueda** — palabra clave, lenguaje, orden (relevancia / forks / actualizados), estrellas mínimas
- **Tarjetas ricas** — propietario, descripción, estrellas, forks, lenguaje, topics, licencia, insignia «estrellas hoy»
- **Tema oscuro / claro** según las preferencias del sistema
- **Interfaz en chino / inglés**, chino por defecto
- **Caché en el servidor** para respetar los límites de GitHub
- Token `GITHUB_TOKEN` opcional para aumentar el límite

### Inicio rápido (Windows)

Haz doble clic en **`start.bat`** en la raíz del repo: comprueba Node.js, instala dependencias en el primer arranque y abre http://localhost:3000.

### Desarrollo local

Requiere [Node.js](https://nodejs.org/) 20+.

```bash
npm install       # Instalar dependencias
npm run dev       # Iniciar el servidor de desarrollo
# Abrir http://localhost:3000
```

### Build de producción

```bash
npm ci
npm run build
npm start         # Sirve en http://localhost:3000
```

### Licencia

[MIT](./LICENSE) © Colaboradores de githubPopularProjects

---

<a id="português"></a>

## Português

> Esta seção é a tradução para português da documentação acima.

# githubPopularProjects (Projetos populares do GitHub)

Um site de código aberto para descobrir repositórios em tendência no GitHub. Navegue pelas tendências oficiais (hoje / esta semana / este mês, filtráveis por linguagem) ou pesquise por palavra-chave, linguagem, ordenação e estrelas mínimas.

Construído com **Next.js 15 + TypeScript + Tailwind CSS**. Funciona onde Node ou Docker rodar — localmente ou em qualquer servidor — e em qualquer navegador moderno (Windows / macOS / Linux).

### Recursos

- **Tendências** — hoje / esta semana / este mês, filtráveis por 20+ linguagens
- **Busca** — palavra-chave, linguagem, ordenação (relevância / forks / atualizados), estrelas mínimas
- **Cartões ricos** — proprietário, descrição, estrelas, forks, linguagem, tópicos, licença, selo «estrelas hoje»
- **Tema escuro / claro** conforme as preferências do sistema
- **Interface em chinês / inglês**, chinês por padrão
- **Cache no servidor** para respeitar os limites do GitHub
- Token `GITHUB_TOKEN` opcional para aumentar o limite

### Início rápido (Windows)

Dê um duplo clique em **`start.bat`** na raiz do repositório: verifica o Node.js, instala dependências na primeira execução e abre http://localhost:3000.

### Desenvolvimento local

Requer [Node.js](https://nodejs.org/) 20+.

```bash
npm install       # Instalar dependências
npm run dev       # Iniciar o servidor de desenvolvimento
# Abrir http://localhost:3000
```

### Build de produção

```bash
npm ci
npm run build
npm start         # Serve em http://localhost:3000
```

### Licença

[MIT](./LICENSE) © Contribuidores do githubPopularProjects

---

<a id="русский"></a>

## Русский

> Этот раздел — перевод документации выше на русский язык.

# githubPopularProjects (Популярные проекты GitHub)

Открытый сайт для поиска трендовых репозиториев GitHub. Просматривайте официальные тренды (сегодня / на этой неделе / в этом месяце, с фильтром по языку) или ищите по ключевому слову, языку, сортировке и минимальному количеству звёзд.

Создан на **Next.js 15 + TypeScript + Tailwind CSS**. Работает везде, где есть Node или Docker — локально или на любом сервере — и в любом современном браузере (Windows / macOS / Linux).

### Возможности

- **Тренды** — сегодня / на этой неделе / в этом месяце, фильтр по 20+ языкам
- **Поиск** — ключевое слово, язык, сортировка (релевантность / форки / недавно обновлённые), минимум звёзд
- **Насыщенные карточки** — владелец, описание, звёзды, форки, язык, темы, лицензия, бейдж «звёзд сегодня»
- **Тёмная / светлая тема** по системным настройкам
- **Китайский / английский интерфейс**, по умолчанию китайский
- **Серверный кэш** для соблюдения лимитов GitHub
- Необязательный `GITHUB_TOKEN` для повышения лимита

### Быстрый старт (Windows)

Дважды щёлкните **`start.bat`** в корне репозитория: проверит Node.js, установит зависимости при первом запуске и откроет http://localhost:3000.

### Локальная разработка

Требуется [Node.js](https://nodejs.org/) 20+.

```bash
npm install       # Установить зависимости
npm run dev       # Запустить dev-сервер
# Открыть http://localhost:3000
```

### Продакшн-сборка

```bash
npm ci
npm run build
npm start         # Раздаёт на http://localhost:3000
```

### Лицензия

[MIT](./LICENSE) © Участники githubPopularProjects

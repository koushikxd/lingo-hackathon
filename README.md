# Lingo Bolt - Translate, understand and manage any GitHub repo

Open source shouldn't have a language barrier. Lingo Bolt is for contributors who want to participate but struggle with the language, and for maintainers who need to manage issues and pull requests from people who don't speak their language.

Connect your GitHub repos, get AI onboarding docs in any language, translate markdown files, and let the bot handle in-repo translation and summarization — so the language gap stops being a blocker.

## Demo

> **[Watch the full demo on YouTube →](https://youtu.be/OlGq3AAdZ08)**

[![Demo video](https://img.youtube.com/vi/OlGq3AAdZ08/maxresdefault.jpg)](https://youtu.be/OlGq3AAdZ08)

**[Blog Post](https://dev.to/koushikxd/lingo-bolt-removing-the-language-barrier-from-opensource-4a48)** · **[Reddit Post](https://www.reddit.com/r/lingodotdev/comments/1raqdr9/built_lingo_bolt_a_github_bot_plus_web_app_that/)**

## Features

- **GitHub auth** — sign in with GitHub, import public or private repos
- **Repo indexing** — indexes your codebase into a vector store for semantic search
- **AI onboarding docs** — generate contributor-ready docs from your codebase in any selected language
- **Markdown translation** — translate any markdown file in a repo, download as individual files or a ZIP
- **AI chat** — ask questions about the repo, browse issues and PRs, find relevant code — all in your language
- **GitHub bot** — install lingo-bolt on your org, and it auto-translates issues, summarizes threads, and labels by language
- **MCP server** — use Lingo Bolt tools directly inside your IDE (Cursor, VS Code, etc.) to browse issues, translate docs, and summarize in your language

## lingo-bolt bot

Install the GitHub App on your account or org. The bot responds to `@lingo-bolt` mentions in issues and PRs.

### Commands

```
@lingo-bolt translate to spanish
```

Translates the issue or PR body and posts a reply.

```
@lingo-bolt summarize
```

Summarizes in the maintainer's default language.

```
@lingo-bolt summarize in french
```

Summarizes in a specific language.

### Automatic features

- **Auto-label** — detects the language of new issues and adds a label like `lang:chinese`
- **Auto-translate** — translates new issues and comments into the maintainer's default language

Manage installations and preferences at `/bot`.

## MCP server (IDE integration)

Runs as a remote HTTP server inside the web app — no separate build step, no env vars in your IDE config. Just start the app and point your IDE at it.

### Tools

| Tool              | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `list_issues`     | List issues with titles translated to your language |
| `get_issue`       | Fetch a full issue with comments, translated        |
| `translate_doc`   | Translate any file (README, CONTRIBUTING, etc.)     |
| `translate_text`  | Translate arbitrary text between languages          |
| `search_codebase` | Semantic search across an indexed repo's code       |
| `get_onboarding`  | Fetch AI-generated onboarding docs for a repo       |

### Try these prompts in your IDE

```
Show me open issues for facebook/react in Spanish
Get issue #42 from vercel/next.js in Hindi
Translate the README of expressjs/express to Japanese
Search the codebase of my-org/my-repo for authentication logic
```

### Setup

Start the app (`pnpm dev`), then add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "lingo-bolt": {
      "type": "remote",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

See [SETUP.md](./SETUP.md) for full details.

## Tech stack

- Next.js (App Router) + React 19
- Lingo.dev API for translation
- tRPC + TanStack Query
- Better Auth
- Prisma + PostgreSQL
- Qdrant (vector store)
- OpenAI (embeddings + generation)
- Tailwind CSS + shadcn/ui
- Turborepo + PNPM workspaces

## Monorepo structure

```
apps/web         Next.js app (UI + route handlers)
packages/api     tRPC routers + indexing/retrieval logic
packages/auth    Better Auth setup
packages/db      Prisma schema + Docker services
packages/env     Shared runtime env validation
packages/config  Shared TypeScript config
packages/mcp     MCP server for IDE integration
```

## Setup

See [SETUP.md](./SETUP.md) for full local setup instructions including GitHub OAuth, GitHub App configuration, ngrok for webhooks, and environment variables.

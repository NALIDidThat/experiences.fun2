# Workspace

## Overview

**experiences.fun** — a platform where users join/create real-world local experiences, earn XP on completion, and upvote each other for contributions. Works as both a standalone web app and a Telegram Mini App.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Routing**: wouter (frontend), Express 5 (backend)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   ├── web-app/            # React + Vite frontend (experiences.fun)
│   └── mockup-sandbox/     # Component preview sandbox
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Key Features

### Onboarding Flow (6 steps, one question per screen)
1. Welcome — hero screen with "Start" CTA
2. Location — city + country inputs
3. Interests — multi-select tile grid (8 categories)
4. Participation — Join/Host/Both (auto-advances on selection)
5. Profile — name, @username, optional bio (Telegram pre-fill if in Mini App)
6. Completion — +50 XP celebration, 3 experience previews, "Explore" CTA

### User Profile (/u/:username)
- Avatar (initials fallback), name, @username, city, bio
- XP total with level bar (500 XP per level)
- Upvote count
- Two tabs: Personal / Professional experiences

### Telegram Integration
- Bot menu button opens the web app
- /start → onboarding or home (if registered)
- /me → shows profile info
- Webhook at POST /api/telegram/webhook
- Bot setup runs on server start (requires MINI_APP_URL env var)

### Dual-mode Detection
- `window.Telegram?.WebApp` detects Telegram Mini App context
- Standalone mode uses localStorage session tokens
- Telegram mode uses initData for auth

## Database Schema

### users table
- id (serial PK), telegram_id (unique, nullable), name, username (unique)
- city, country, interests (text[]), role (join|host|both), bio (nullable)
- xp (default 0), upvote_count (default 0), session_token, created_at

## Authentication

### Dual-mode auth
- **Telegram Mini App**: `X-Telegram-Init-Data` header verified server-side with HMAC
- **Standalone web**: `Authorization: Bearer <session_token>` header; session token stored in localStorage after onboarding

### Auth middleware
- `optionalAuth` middleware (`api-server/src/lib/auth-middleware.ts`) runs on all routes
- Reads Bearer token from Authorization header, looks up user by `session_token` column
- Sets `req.currentUser` if found (undefined otherwise)

### Edit profile flow
- Standalone users with a session token can re-enter onboarding to edit their profile
- The onboarding endpoint checks `req.currentUser` and UPDATEs instead of INSERTing

## API Endpoints

- `GET /api/healthz` — health check
- `POST /api/onboarding/complete` — complete onboarding, create/update user, award 50 XP
- `GET /api/users/me` — get current user profile (requires Bearer token)
- `GET /api/users/:username` — get user profile by username
- `GET /api/users/check-username/:username` — check username availability
- `POST /api/telegram/webhook` — Telegram bot webhook

## Environment Variables

- `TELEGRAM_BOT_TOKEN` — Telegram bot API token (shared secret)
- `MINI_APP_URL` — Published Replit domain for webhook + menu button setup
- `DATABASE_URL` — Auto-provided by Replit
- `PORT` — Auto-assigned per artifact

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/web-app` (`@workspace/web-app`)

React + Vite frontend at root path `/`. Uses wouter for routing, Framer Motion for animations, and shadcn/ui components. Dual-mode: standalone web app + Telegram Mini App.

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for validation and `@workspace/db` for persistence. Sets up Telegram bot webhook on start.

- Routes: health, onboarding, users, telegram
- Entry: `src/index.ts` — reads `PORT`, starts Express, calls `setupTelegramBot()`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Schema: users table.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval codegen config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts. Run via `pnpm --filter @workspace/scripts run <script>`.

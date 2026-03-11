# gesdep-middleware

Middleware that exposes a stable JSON REST API over Gesdep.net using Playwright automation.

## Prerequisites
- Node.js 18+
- MySQL 8+
- pnpm or npm
- Valid Gesdep credentials

## Setup
```bash
pnpm install           # or npm install
pnpm install:browsers  # or npm run install:browsers
cp .env.example .env   # fill credentials (GESDEP_*) and DB settings
```

Required env vars:
- `GESDEP_USERNAME`
- `GESDEP_PASSWORD`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

## Development
```bash
pnpm dev               # fast reload with tsx
```

## Build & Run
```bash
pnpm build
pnpm start
```

The production entrypoint is `dist/src/api/server.js`.

## Tests
```bash
pnpm test              # unit/integration with Vitest
```

## Lint & Typecheck
```bash
pnpm lint
pnpm typecheck
```

## Probe Login
```bash
pnpm probe:login       # or npm run probe:login
```

If Playwright browsers are missing, install them with `pnpm install:browsers`.

Successful probes save artifacts under `artifacts/screenshots` and `artifacts/html`.

## Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

## Why Knex?
Knex is a lightweight, mature query builder with first-class MySQL support. It keeps the footprint small while allowing future migration to an ORM if needed.

## Notes
- Browser automation lives under `src/gesdep`. Replace placeholders with real flows.
- Add migrations under `src/db/migrations` (configure in `src/db/knex.ts`).
- Current `npm audit` findings require major-version upgrades for `fastify`, `vitest`, and `@typescript-eslint/*`; they are not fixed in this pass.

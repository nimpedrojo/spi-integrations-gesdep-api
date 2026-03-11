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
cp .env.example .env   # fill credentials (GESDEP_*) and DB settings
```

## Development
```bash
pnpm dev               # fast reload with tsx
```

## Build & Run
```bash
pnpm build
pnpm start
```

## Tests
```bash
pnpm test              # unit/integration with Vitest
```

## Lint & Typecheck
```bash
pnpm lint
pnpm typecheck
```

## Why Knex?
Knex is a lightweight, mature query builder with first-class MySQL support. It keeps the footprint small while allowing future migration to an ORM if needed.

## Notes
- Browser automation lives under `src/gesdep`. Replace placeholders with real flows.
- Add migrations under `src/db/migrations` (configure in `src/db/knex.ts`).

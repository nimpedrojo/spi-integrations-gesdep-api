# gesdep-middleware

Middleware que expone una API REST estable sobre Gesdep.net.

Arquitectura actual:
- La API intenta leer primero desde MySQL
- Delante de MySQL hay una cache TTL en memoria
- Si la BD no tiene datos, la API puede hacer fallback al scraping online de Gesdep
- Un proceso batch sincroniza equipos y jugadores desde Gesdep hacia MySQL

Objetivo operativo:
- minimizar navegación Playwright en caliente
- responder en milisegundos desde BD/cache
- dejar Gesdep como origen de sincronización, no como backend de serving

## Requisitos
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

Variables obligatorias:
- `API_AUTH_USERNAME`
- `API_AUTH_PASSWORD`
- `API_JWT_SECRET`
- `GESDEP_USERNAME`
- `GESDEP_PASSWORD`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

Variables recomendadas:
- `GESDEP_DETAIL_CONCURRENCY`
- `CACHE_TTL_TEAMS_SECONDS`
- `CACHE_TTL_TEAMS_EXTENDED_SECONDS`
- `CACHE_TTL_PLAYER_SECONDS`

## Modelo de ejecución
Flujo normal de lectura:
1. Llega una request a la API
2. Se consulta la cache en memoria
3. Si no hay hit, se consulta MySQL
4. Si MySQL está vacío, se hace fallback a Gesdep
5. La respuesta se almacena en cache durante su TTL

Flujo de sincronización:
1. El job batch hace login en Gesdep
2. Descarga el listado extendido de equipos
3. Descarga la ficha de cada jugador detectado
4. Reemplaza el snapshot local en MySQL
5. Invalida la cache en memoria
6. Tras añadir los jugadores desde Gesdep, sus datos se pueden actualizar desde la API consultando `GET /players/:externalid`

## Desarrollo
```bash
pnpm dev               # fast reload with tsx
```

## Build y ejecución
```bash
pnpm build
pnpm start
```

Entrypoint de producción: `dist/src/api/server.js`.

## Tests
```bash
pnpm test              # unit/integration with Vitest
```

## Lint & Typecheck
```bash
pnpm lint
pnpm typecheck
```

## Scripts útiles
```bash
pnpm probe:login       # or npm run probe:login
pnpm sync:gesdep       # or npm run sync:gesdep
```

Si faltan los navegadores de Playwright:
```bash
pnpm install:browsers
```

Los artefactos de debugging se guardan en:
- `artifacts/screenshots`
- `artifacts/html`

## Endpoints
```bash
GET /health
POST /auth/token
GET /teams
GET /teams/extended
GET /players/:id
GET /docs
GET /docs/json
```

Autenticacion:
- `POST /auth/token` devuelve un Bearer token JWT
- `GET /teams`
- `GET /teams/extended`
- `GET /players/:id`

Ejemplo:
```bash
curl -X POST http://localhost:3000/auth/token \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"change-me"}'
```

Luego usa el token:
```bash
curl http://localhost:3000/teams \
  -H "authorization: Bearer TU_TOKEN"
```

Semántica actual:
- `/auth/token`:
  - valida credenciales propias de la API
  - emite un JWT Bearer
- `/teams`:
  - lectura desde cache o MySQL
  - fallback online si la BD aún no tiene datos
- `/teams/extended`:
  - igual que `/teams`, pero con roster de jugadores
- `/players/:id`:
  - lectura desde cache o MySQL
  - fallback online si el jugador no existe en BD
  - permite refrescar los datos de un jugador ya sincronizado usando su identificador externo de Gesdep (`externalid`)

El campo `meta.source` puede ser:
- `mysql`
- `gesdep`

Documentación:
- `/docs`: interfaz Swagger UI
- `/docs/json`: especificación OpenAPI en JSON

## Health check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

## Batch Sync
Ejecuta una sincronización completa desde Gesdep hacia MySQL:
```bash
npm run sync:gesdep
```

El proceso:
- inicializa el esquema si no existe
- registra una fila en `sync_runs`
- sincroniza equipos y jugadores
- reemplaza el snapshot persistido
- limpia la cache en memoria

Tablas creadas automáticamente:
- `teams`
- `players`
- `team_players`
- `sync_runs`

Ejemplo de operación diaria con cron:
```bash
0 3 * * * cd /ruta/al/proyecto && npm run sync:gesdep >> /var/log/gesdep-sync.log 2>&1
```

## Cache TTL
Variables disponibles:
- `CACHE_TTL_TEAMS_SECONDS`
- `CACHE_TTL_TEAMS_EXTENDED_SECONDS`
- `CACHE_TTL_PLAYER_SECONDS`

Valores por defecto:
- `/teams`: `300`
- `/teams/extended`: `1800`
- `/players/:id`: `3600`

## Por qué Knex
Knex mantiene el stack simple y suficiente para:
- queries controladas
- upserts y reemplazos batch
- migración futura a un modelo más complejo si hace falta

## Notes
- La automatización de Gesdep vive bajo `src/gesdep`
- El esquema ahora se auto-inicializa al arrancar servidor o ejecutar el batch
- Hoy el almacenamiento es snapshot completo, no CDC ni sincronización incremental
- El siguiente paso recomendado es exponer estado de sincronización y programar el batch de forma supervisada

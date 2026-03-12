# gesdep-middleware

Middleware que expone una API REST estable sobre Gesdep.net.

Arquitectura actual:
- La API intenta leer primero desde MySQL
- Delante de MySQL hay una cache TTL en memoria
- Si la BD no tiene datos, la API puede hacer fallback al scraping online de Gesdep
- Un proceso batch sincroniza equipos y jugadores desde Gesdep hacia MySQL
- Para estadisticas de trabajo por equipo, el batch puede materializar un snapshot diario por equipo para reconstruir rangos desde MySQL

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
5. Descarga las estadisticas de trabajo del dia anterior para cada equipo y las guarda con granularidad diaria
6. Invalida la cache en memoria
7. Tras añadir los jugadores desde Gesdep, sus datos se pueden actualizar desde la API consultando `GET /players/:externalid`

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
GET /teams/:teamId/work-stats?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /players/:id
GET /docs
GET /docs/json
```

Autenticacion:
- `POST /auth/token` devuelve un Bearer token JWT
- `GET /teams`
- `GET /teams/extended`
- `GET /teams/:teamId/work-stats?from=YYYY-MM-DD&to=YYYY-MM-DD`
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

Ejemplo de estadisticas de trabajo:
```bash
curl "http://localhost:3000/teams/636/work-stats?from=2026-03-01&to=2026-03-07" \
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
- `/teams/:teamId/work-stats`:
  - requiere `from` y `to` en formato `YYYY-MM-DD`
  - intenta responder desde cache y MySQL si el rango completo ya fue materializado por el batch diario
  - si falta algun dia del rango, hace fallback online a Gesdep
  - devuelve agregados por metodo de entrenamiento y el Top 20 de ejercicios

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
- sincroniza las estadisticas de trabajo del dia anterior por equipo
- reemplaza el snapshot persistido
- limpia la cache en memoria

Tablas creadas automáticamente:
- `teams`
- `players`
- `team_players`
- `team_work_daily_sync`
- `team_work_method_daily`
- `team_work_exercise_daily`
- `sync_runs`

## Flujo de estadisticas de trabajo
Lectura de `GET /teams/:teamId/work-stats`:
1. La API valida `teamId`, `from` y `to`
2. Busca en cache de memoria para la clave `team-work-stats:{teamId}:{from}:{to}`
3. Comprueba en MySQL si existe cobertura diaria completa para todas las fechas del rango
4. Si existe cobertura completa, agrega desde `team_work_method_daily` y `team_work_exercise_daily`
5. Si falta cobertura en algun dia, consulta online Gesdep en `frmejerestadisticas.aspx`
6. La respuesta informa el origen en `meta.source`

Flujo batch diario para estas estadisticas:
1. Al ejecutar `npm run sync:gesdep`, despues de sincronizar equipos y jugadores
2. Se consulta Gesdep para cada equipo con el rango de un solo dia correspondiente al dia anterior
3. Se guardan los minutos por metodo en `team_work_method_daily`
4. Se guarda el Top 20 de ejercicios del dia en `team_work_exercise_daily`
5. Se marca cobertura diaria en `team_work_daily_sync`

Limitacion relevante:
- Gesdep devuelve agregados por rango. Para que MySQL pueda responder rangos arbitrarios sin volver a Gesdep, el batch guarda datos diarios por equipo. Si falta un dia intermedio, la API cae a lectura online.

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

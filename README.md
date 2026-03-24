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
GET /teams/:teamId/matches?competition=all|league|cup|friendly|tournament&result=all|won|drawn|lost
GET /teams/:teamId/matches/stats?competition=all|league|cup|friendly|tournament&result=all|won|drawn|lost
GET /players/:id
GET /docs
GET /docs/json
```

Autenticacion:
- `POST /auth/token` devuelve un Bearer token JWT
- `GET /teams`
- `GET /teams/extended`
- `GET /teams/:teamId/work-stats?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /teams/:teamId/matches?competition=all|league|cup|friendly|tournament&result=all|won|drawn|lost`
- `GET /teams/:teamId/matches/stats?competition=all|league|cup|friendly|tournament&result=all|won|drawn|lost`
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

Ejemplo de partidos jugados:
```bash
curl "http://localhost:3000/teams/636/matches?competition=league&result=all" \
  -H "authorization: Bearer TU_TOKEN"
```

Ejemplo de resumen de partidos:
```bash
curl "http://localhost:3000/teams/636/matches/stats?competition=league&result=all" \
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
- `/teams/:teamId/matches`:
  - acepta filtros opcionales `competition` y `result`
  - intenta responder desde cache y MySQL si existe listado persistido de la temporada del equipo
  - si no existe snapshot local, hace fallback online a Gesdep
  - devuelve rival, resultado, fecha, lugar y competicion de cada partido
- `/teams/:teamId/matches/stats`:
  - acepta filtros opcionales `competition` y `result`
  - intenta responder desde cache y MySQL si existe snapshot de temporada del equipo
  - si no existe snapshot local, hace fallback online a Gesdep
  - devuelve resumen global/local/visitante

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
- sincroniza el snapshot completo de partidos de temporada por equipo
- reemplaza el snapshot persistido
- limpia la cache en memoria

Tablas creadas automáticamente:
- `teams`
- `players`
- `team_players`
- `team_work_daily_sync`
- `team_work_method_daily`
- `team_work_exercise_daily`
- `team_matches`
- `team_match_stat_snapshots`
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

## Flujo de partidos jugados
Lectura de `GET /teams/:teamId/matches/stats`:
1. La API valida `teamId` y aplica filtros opcionales `competition` y `result`
2. Busca en cache de memoria para la clave `team-match-stats:{teamId}:{competition}:{result}`
3. Si existe snapshot local en `team_match_stat_snapshots`, responde desde MySQL
4. Si no existe snapshot local, consulta online Gesdep en `frmpartidos.aspx`
5. La respuesta informa el origen en `meta.source`

Flujo batch diario para partidos:
1. Al ejecutar `npm run sync:gesdep`, por cada equipo se consulta `frmpartidos.aspx`
2. Se guardan snapshots agregados por combinación `competition/result` en `team_match_stat_snapshots`
3. Los filtros por competición y resultado se resuelven después desde MySQL sin volver a Gesdep

## Despliegue en producción
### Suposiciones
- Host Linux con `systemd`
- Node.js 18+ o 20+
- MySQL 8+
- Nginx o proxy equivalente delante de la aplicación
- Credenciales válidas de Gesdep

### 1. Crear usuario y directorios
```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin gesdep
sudo mkdir -p /var/www/gesdep-middleware
sudo chown -R gesdep:gesdep /var/www/gesdep-middleware
```

### 2. Copiar el código y preparar variables
Despliega el proyecto en `/var/www/gesdep-middleware` y crea el fichero `.env` con valores reales.

Ejemplo mínimo:
```dotenv
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

API_AUTH_USERNAME=admin
API_AUTH_PASSWORD=una-password-fuerte
API_JWT_SECRET=un-secreto-largo-y-unico
API_JWT_EXPIRES_IN=1d

GESDEP_BASE_URL=https://www.gesdep.net
GESDEP_HEADLESS=true
GESDEP_DETAIL_CONCURRENCY=4
GESDEP_USERNAME=usuario_gesdep
GESDEP_PASSWORD=password_gesdep

DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=gesdep_app
DATABASE_PASSWORD=password_mysql
DATABASE_NAME=gesdep

CACHE_TTL_TEAMS_SECONDS=300
CACHE_TTL_TEAMS_EXTENDED_SECONDS=1800
CACHE_TTL_PLAYER_SECONDS=3600
```

Recomendaciones:
- no uses los valores por defecto de `API_AUTH_*` ni `API_JWT_SECRET`
- reduce `GESDEP_DETAIL_CONCURRENCY` si el servidor tiene pocos recursos o Gesdep empieza a responder lento
- mantén `GESDEP_HEADLESS=true` en producción

### 3. Instalar dependencias y compilar
```bash
cd /var/www/gesdep-middleware
npm ci
npm run install:browsers
npm run build
```

Si el servidor no tiene las dependencias del navegador, instala también librerías del sistema requeridas por Chromium de Playwright.

### 4. Preparar MySQL
Ejemplo de creación de base de datos y usuario:
```sql
CREATE DATABASE gesdep CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gesdep_app'@'127.0.0.1' IDENTIFIED BY 'password_mysql';
GRANT ALL PRIVILEGES ON gesdep.* TO 'gesdep_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

No hace falta ejecutar migraciones manuales:
- el esquema se auto-inicializa al arrancar la API
- el esquema también se auto-inicializa al ejecutar el batch

### 5. Levantar la API con systemd
Crea `/etc/systemd/system/gesdep-middleware.service`:

```ini
[Unit]
Description=Gesdep Middleware API
After=network.target mysql.service
Wants=network.target

[Service]
Type=simple
User=gesdep
Group=gesdep
WorkingDirectory=/var/www/gesdep-middleware
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /var/www/gesdep-middleware/dist/src/api/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activación:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gesdep-middleware
sudo systemctl status gesdep-middleware
```

Logs:
```bash
journalctl -u gesdep-middleware -f
```

### 6. Programar el batch diario
Opción recomendada con `cron` del sistema para el usuario `gesdep`:
```bash
sudo crontab -u gesdep -e
```

Ejemplo:
```cron
0 3 * * * cd /var/www/gesdep-middleware && /usr/bin/npm run sync:gesdep >> /var/log/gesdep-sync.log 2>&1
```

Si prefieres `systemd`, crea un `service` y un `timer` dedicados para `sync:gesdep`.

### 7. Publicar detrás de Nginx
Ejemplo simple:

```nginx
server {
    listen 80;
    server_name api.tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Después añade TLS con Let's Encrypt o tu terminación SSL habitual.

### 8. Verificación post-despliegue
Comprobar salud:
```bash
curl http://127.0.0.1:3000/health
```

Pedir token:
```bash
curl -X POST http://127.0.0.1:3000/auth/token \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"tu-password"}'
```

Comprobar Swagger:
```bash
curl http://127.0.0.1:3000/docs/json
```

Lanzar una sincronización manual:
```bash
cd /var/www/gesdep-middleware
npm run sync:gesdep
```

### 9. Actualización de versión
Flujo recomendado:
```bash
cd /var/www/gesdep-middleware
git pull
npm ci
npm run build
sudo systemctl restart gesdep-middleware
```

Si hay cambios relevantes en scraping o batch:
```bash
npm run sync:gesdep
```

### 10. Checklist operativo
- la API responde en `/health`
- `/docs` carga y muestra endpoints
- `npm run sync:gesdep` termina sin errores
- `journalctl -u gesdep-middleware -f` no muestra reinicios en bucle
- la base de datos contiene `sync_runs` y snapshots recientes
- el cron o timer diario está activo

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

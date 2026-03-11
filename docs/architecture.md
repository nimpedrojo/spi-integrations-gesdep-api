# Architecture Notes

## Overview
- Fastify sirve la API HTTP.
- MySQL es la fuente principal de lectura para los endpoints.
- Una cache TTL en memoria reduce todavía más la carga sobre MySQL.
- Gesdep se usa como sistema origen para la sincronización batch y como fallback de lectura cuando la BD no está poblada.

## Read Path
Camino normal de una request:
1. Route handler
2. Read service
3. Memory cache
4. Repository MySQL
5. Fallback opcional a use case online contra Gesdep

Implementaciones relevantes:
- `src/api/routes/teams.ts`
- `src/api/routes/players.ts`
- `src/application/teamReadService.ts`
- `src/application/playerReadService.ts`
- `src/shared/memoryCache.ts`
- `src/db/repositories/*`

## Sync Path
La sincronización batch usa Gesdep como origen:
1. Login y navegación Playwright
2. Parseo de equipos y detalle de jugadores
3. Reemplazo del snapshot en MySQL
4. Invalidación de cache

Implementaciones relevantes:
- `src/application/gesdepSyncService.ts`
- `src/scripts/sync-gesdep.ts`
- `src/application/listTeamsUseCase.ts`
- `src/application/getPlayerUseCase.ts`

## Persistence Model
Tablas actuales:
- `teams`
- `players`
- `team_players`
- `sync_runs`

Responsabilidades:
- `teams`: snapshot de equipos visibles por API
- `players`: snapshot de fichas de jugador
- `team_players`: relación roster-equipo con orden
- `sync_runs`: auditoría operativa del batch

El esquema se crea si no existe desde:
- `src/db/schema.ts`

## Gesdep Integration
La integración con Gesdep vive en `src/gesdep`:
- `browser`: lifecycle de Playwright
- `actions`: navegación/login
- `parsers`: traducción HTML -> dominio
- `selectors`: puntos de acoplamiento al DOM

Puntos de coste:
- login
- navegación a listados y fichas
- espera de selectores
- volumen de páginas abiertas

Por eso el modelo recomendado es BD-first y no scraping por request.

## Cache Strategy
La cache actual:
- es in-memory
- usa TTL por tipo de recurso
- deduplica requests concurrentes por clave

Claves actuales:
- `teams:basic`
- `teams:extended`
- `player:<id>`

## Failure Modes
Casos contemplados:
- si MySQL no tiene datos, el sistema puede responder desde Gesdep
- si falla el parseo, se guardan snapshots HTML para diagnóstico
- si Gesdep falla y no hay datos locales, el endpoint falla

## Current Tradeoffs
- Ventaja: mejora fuerte de latencia en lectura una vez sincronizado
- Ventaja: mucho menos acoplamiento operativo a Gesdep en tiempo real
- Coste: consistencia eventual entre Gesdep y MySQL
- Coste: el batch actual hace reemplazo completo, no sincronización incremental

## Next Recommended Steps
- programar el batch diario de forma supervisada
- añadir endpoint de estado de sincronización
- introducir sincronización incremental
- persistir sesión autenticada o storage state para reducir coste del batch
- unificar definitivamente la gestión de browser/context/session

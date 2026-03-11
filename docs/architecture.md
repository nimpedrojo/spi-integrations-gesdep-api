# Architecture Notes

- Fastify serves the REST API with centralized error handling and structured logging.
- Application layer manages sessions and orchestration between API, Gesdep automation, parsers, and persistence.
- Gesdep integration lives under `src/gesdep` and is split into browser factory, actions (automation flows), parsers, and selectors.
- Persistence uses Knex on MySQL; swap connection settings via env.

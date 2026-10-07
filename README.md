# node-express-mongo-playground

A small but production-style **HR performance platform** (organizations, users, feedback,
review cycles, reviews with AI summaries) built as a learning project for Node.js:

- **Backend:** Node.js 22 · TypeScript · Express 5 · MongoDB 7 + Mongoose · Zod · BullMQ + Redis
- **Frontend:** React + TypeScript (Vite) talking to the API **only** through a client
  generated from the backend's OpenAPI spec
- **Infra:** Docker Compose (API, worker, web, Mongo replica set, Redis, mongo-express)

The commit history is part of the learning material: every commit adds one concept, and
each phase ends with a git tag (`phase-01-skeleton`, `phase-02-auth`, …).

## Contents

1. [Running it](#running-it)
2. [Request lifecycle walkthrough](#request-lifecycle-walkthrough)
3. [From Zod schema to React component](#from-zod-schema-to-react-component)
4. [Concepts map](#concepts-map)
5. [Try it yourself](#try-it-yourself)
6. [Laravel / FastAPI → Express cheat sheet](#laravel--fastapi--express-cheat-sheet)
7. [Interview questions](#interview-questions)
8. [Build log](#build-log)

## Running it

### With Docker (recommended)

Requirements: Docker Desktop (or Docker Engine + Compose v2).

```bash
cp .env.example .env   # optional: the defaults work out of the box
docker compose up --build
```

`docker compose up` merges `docker-compose.yml` with `docker-compose.override.yml`, so you get
the **dev** setup: source code is bind-mounted and the API restarts on every save (`tsx watch`).
To run the production-like images instead:

```bash
docker compose -f docker-compose.yml up --build
```

| What          | URL                          | Notes                                   |
| ------------- | ---------------------------- | --------------------------------------- |
| API           | http://localhost:3000        |                                         |
| Health check  | http://localhost:3000/health | pings Mongo + Redis, 503 if one is down |
| mongo-express | http://localhost:8081        | login `admin` / `admin`                 |
| MongoDB       | `localhost:27017`            | single-node replica set `rs0`           |
| Redis         | `localhost:6379`             |                                         |

To connect to Mongo from your machine (Compass, mongosh, `npm run dev`), use
`mongodb://localhost:27017/hr?directConnection=true`. The replica set advertises its member as
`mongo:27017`, a hostname that only resolves inside the Docker network; `directConnection=true`
tells the driver to talk to the node you gave it instead of the advertised one.

### Without Docker for the API (faster feedback loop)

Keep Mongo and Redis in Docker, run the API on your machine:

```bash
npm install
cp .env.example .env
docker compose up -d mongo redis
npm run dev      # tsx watch, reads ../../.env via Node's --env-file-if-exists
```

### Checks

```bash
npm run lint        # ESLint (type-aware) across all workspaces
npm run typecheck   # tsc --noEmit in every workspace
npm test            # Vitest; Mongo runs in-memory (mongodb-memory-server)
npm run format      # Prettier
```

The first `npm test` downloads a MongoDB 7 binary (~100 MB) for mongodb-memory-server.

### Project layout

```
apps/api                 Express backend (+ worker process, later)
  src/app.ts             builds the Express app (no listen: importable by tests)
  src/server.ts          connects Mongo/Redis, listens, graceful shutdown
  src/config/env.ts      Zod-validated environment variables
  src/db/                Mongo + Redis connections
  src/routes/            URL -> controller
  src/controllers/       HTTP only: read request, call service, send response
  src/services/          business logic, no req/res (reusable from workers)
  src/lib/               logger, shutdown helpers, ...
  tests/                 Vitest + Supertest
apps/web                 React frontend (phase 5)
packages/api-client      client generated from the OpenAPI spec (phase 4)
```

**Why npm workspaces (and not pnpm)?** npm ships with Node, so there is nothing to install, and
for three packages its hoisted `node_modules` works fine. pnpm is faster and stricter: it uses a
content-addressed store, and a package can only import dependencies it declares, so there are
no "phantom dependencies". In a large monorepo I'd pick pnpm. Here, fewer tools wins.

## Request lifecycle walkthrough

_Coming in phase 5._

## From Zod schema to React component

_Coming in phase 4._

## Concepts map

| Concept                         | File(s)                                                          | One-liner                                                        |
| ------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| App vs server split             | `apps/api/src/app.ts`, `apps/api/src/server.ts`                  | build the app without `listen()` so Supertest can import it      |
| Env validation (fail fast)      | `apps/api/src/config/env.ts`                                     | Zod parses `process.env` once; invalid config crashes on startup |
| Structured logging              | `apps/api/src/lib/logger.ts`                                     | Pino JSON to stdout in prod, pino-pretty (worker thread) in dev  |
| One connection pool per process | `apps/api/src/db/mongo.ts`, `apps/api/src/db/redis.ts`           | connect once at startup, share it across concurrent requests     |
| Health check with timeouts      | `apps/api/src/services/health.service.ts`                        | `Promise.allSettled` + `Promise.race` timeout per dependency     |
| Graceful shutdown               | `apps/api/src/lib/shutdown.ts`, `apps/api/src/server.ts`         | SIGTERM → stop accepting → finish in-flight → close DBs          |
| Crash handlers                  | `apps/api/src/lib/shutdown.ts`                                   | `unhandledRejection` / `uncaughtException` → log and exit        |
| Test DB per file                | `apps/api/tests/global-setup.ts`, `apps/api/tests/helpers/db.ts` | one in-memory replica set, a fresh database per test file        |
| Multi-stage Docker build        | `apps/api/Dockerfile`                                            | ship only compiled JS + prod deps, run as non-root               |
| Mongo replica set in Compose    | `docker-compose.yml`                                             | transactions need a replica set, even a single-node one          |
| Hot reload in Docker            | `docker-compose.override.yml`                                    | bind mount + `tsx watch` + anonymous `node_modules` volume       |

## Try it yourself

**Health check vs a dead dependency**

```bash
curl -s localhost:3000/health          # {"status":"ok",...}
docker compose stop redis
curl -si localhost:3000/health         # 503 after ~1s: the per-check timeout
docker compose start redis
```

**Fail-fast config:** set `PORT=abc` in `.env` and restart the API. It refuses to boot and
prints exactly which variable is wrong.

**Graceful shutdown:** `docker compose stop api` and read `docker compose logs api`. You'll see
"Shutting down gracefully" → "Shutdown complete" within milliseconds, instead of Docker waiting
10s and sending SIGKILL.

## Laravel / FastAPI → Express cheat sheet

| Laravel / FastAPI                           | Node / Express (this repo)                                   |
| ------------------------------------------- | ------------------------------------------------------------ |
| `public/index.php` + HTTP Kernel            | `app.ts` (build the app) + `server.ts` (listen)              |
| `php artisan serve` / `uvicorn --reload`    | `tsx watch src/server.ts`                                    |
| `.env` + `config/*.php` / pydantic-settings | Node `--env-file` + Zod schema in `config/env.ts`            |
| Monolog (`storage/logs`) / `logging`        | Pino, JSON lines to stdout                                   |
| `Route::prefix()->group()` / `APIRouter`    | `express.Router()` mounted with `app.use('/prefix', router)` |
| PHP-FPM manages processes & shutdown        | the Node process IS the server: handle SIGTERM yourself      |
| `RefreshDatabase` / pytest fixtures         | `useTestDb()` helper + mongodb-memory-server                 |
| `$this->getJson()` / `TestClient`           | Supertest `request(app).get()`                               |

## Interview questions

_Coming in phase 10._

## Build log

| Tag                 | Summary                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `phase-01-skeleton` | monorepo, TypeScript, lint, Express app, env, logging, Mongo/Redis, health, shutdown, Docker |

_Polished in phase 10._

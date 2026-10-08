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

### Seed data and login users

```bash
docker compose exec api npm run seed     # or `npm run seed` when the API runs on your machine
```

This wipes and recreates two organizations. **Every password is `password123`.**

| Email              | Org       | Role     | Reports to |
| ------------------ | --------- | -------- | ---------- |
| `alice@acme.test`  | Acme Corp | admin    |            |
| `maria@acme.test`  | Acme Corp | manager  |            |
| `mike@acme.test`   | Acme Corp | manager  |            |
| `eve@acme.test`    | Acme Corp | employee | Maria      |
| `ethan@acme.test`  | Acme Corp | employee | Maria      |
| `emma@acme.test`   | Acme Corp | employee | Mike       |
| `gus@globex.test`  | Globex    | admin    |            |
| `gina@globex.test` | Globex    | manager  |            |
| `gary@globex.test` | Globex    | employee | Gina       |

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
  src/middleware/        request id, logging, security, validate, auth, roles, errors
  src/models/            Mongoose schemas + models
  src/schemas/           Zod schemas: request bodies AND response DTOs
  src/lib/               errors, logger, shutdown helpers, ...
  src/types/             declaration merging (req.user, req.requestId)
  scripts/seed.ts        demo data
  tests/                 Vitest + Supertest
apps/web                 React frontend (phase 5)
packages/api-client      client generated from the OpenAPI spec (phase 4)
```

### API endpoints

Swagger UI arrives in phase 4. Until then, this is the full list (everything except `/health`
and `/auth/login` needs the session cookie):

| Method & path                       | Who                                | What                                                     |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| `POST /auth/login` · `/auth/logout` | anyone                             | session cookie in / out                                  |
| `GET /auth/me`                      | any role                           | current user + organization                              |
| `GET /users` · `/users/:id`         | any role                           | the organization's directory                             |
| `GET /feedback`                     | any role (visibility)              | `?page&pageSize&q&employeeId`                            |
| `POST /feedback`                    | any role                           | `{ employeeId, text, source? }`                          |
| `GET/PATCH/DELETE /feedback/:id`    | visibility / author / author+admin |                                                          |
| `GET /review-cycles` · `/:id`       | any role                           | `?status`                                                |
| `POST /review-cycles`               | admin                              | `{ name, competencies, questions?, startsAt?, endsAt? }` |
| `POST /review-cycles/:id/activate`  | admin                              | creates a review per managed employee                    |
| `GET /reviews` · `/reviews/:id`     | any role (visibility)              | `?cycleId&employeeId&status`                             |
| `PATCH /reviews/:id`                | reviewer or admin                  | `{ scores?, answers? }`                                  |
| `POST /reviews/:id/submit`          | reviewer or admin                  | pending → submitted                                      |

**Visibility:** admins see their whole organization, managers see themselves + their direct
reports, employees see themselves (plus feedback they wrote). Another organization's data is
always a **404**, never a 403.

**Why npm workspaces (and not pnpm)?** npm ships with Node, so there is nothing to install, and
for three packages its hoisted `node_modules` works fine. pnpm is faster and stricter: it uses a
content-addressed store, and a package can only import dependencies it declares, so there are
no "phantom dependencies". In a large monorepo I'd pick pnpm. Here, fewer tools wins.

## Request lifecycle walkthrough

_Coming in phase 5._

## From Zod schema to React component

_Coming in phase 4._

## Concepts map

| Concept                                | File(s)                                                                            | One-liner                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| App vs server split                    | `apps/api/src/app.ts`, `apps/api/src/server.ts`                                    | build the app without `listen()` so Supertest can import it           |
| Env validation (fail fast)             | `apps/api/src/config/env.ts`                                                       | Zod parses `process.env` once; invalid config crashes on startup      |
| Structured logging                     | `apps/api/src/lib/logger.ts`                                                       | Pino JSON to stdout in prod, pino-pretty (worker thread) in dev       |
| One connection pool per process        | `apps/api/src/db/mongo.ts`, `apps/api/src/db/redis.ts`                             | connect once at startup, share it across concurrent requests          |
| Health check with timeouts             | `apps/api/src/services/health.service.ts`                                          | `Promise.allSettled` + `Promise.race` timeout per dependency          |
| Graceful shutdown                      | `apps/api/src/lib/shutdown.ts`, `apps/api/src/server.ts`                           | SIGTERM → stop accepting → finish in-flight → close DBs               |
| Crash handlers                         | `apps/api/src/lib/shutdown.ts`                                                     | `unhandledRejection` / `uncaughtException` → log and exit             |
| Test DB per file                       | `apps/api/tests/global-setup.ts`, `apps/api/tests/helpers/db.ts`                   | one in-memory replica set, a fresh database per test file             |
| Multi-stage Docker build               | `apps/api/Dockerfile`                                                              | ship only compiled JS + prod deps, run as non-root                    |
| Mongo replica set in Compose           | `docker-compose.yml`                                                               | transactions need a replica set, even a single-node one               |
| Hot reload in Docker                   | `docker-compose.override.yml`                                                      | bind mount + `tsx watch` + anonymous `node_modules` volume            |
| Middleware order                       | `apps/api/src/app.ts`                                                              | request id → logger → helmet → cors → parsers → routes → 404 → errors |
| Request id                             | `apps/api/src/middleware/request-id.ts`                                            | one id per request in logs, response header and error body            |
| HTTP logging                           | `apps/api/src/middleware/http-logger.ts`                                           | pino-http: one line per request with status and timing                |
| Declaration merging                    | `apps/api/src/types/express.d.ts`                                                  | adds `req.user` / `req.requestId` to Express's `Request` type         |
| AppError hierarchy                     | `apps/api/src/lib/errors.ts`                                                       | services throw typed errors; they never touch `res`                   |
| Centralized error handler              | `apps/api/src/middleware/error-handler.ts`                                         | 4-arg middleware, one error shape, no stack traces in prod            |
| Async errors in Express 5              | `apps/api/src/middleware/error-handler.ts`, `apps/api/tests/error-handler.test.ts` | rejected promises reach the error handler, no wrapper needed          |
| `validate()` middleware                | `apps/api/src/middleware/validate.ts`                                              | Zod parses body/params/query; 400 with field errors                   |
| Express 5 read-only `req.query`        | `apps/api/src/middleware/validate.ts`                                              | `Object.defineProperty` to store the parsed query                     |
| JWT in httpOnly cookie                 | `apps/api/src/lib/auth-cookie.ts`, `apps/api/src/services/auth.service.ts`         | XSS can't read it; SameSite=Lax against CSRF                          |
| Auth middleware                        | `apps/api/src/middleware/authenticate.ts`                                          | verifies the cookie JWT, loads the user, sets `req.user`              |
| Role middleware                        | `apps/api/src/middleware/require-role.ts`                                          | middleware factory: `requireRole('admin', 'manager')`                 |
| Rate limiting                          | `apps/api/src/middleware/rate-limit.ts`                                            | 5 failed logins per IP per 15 min; `trust proxy` matters              |
| Helmet + CORS with cookies             | `apps/api/src/middleware/security.ts`                                              | explicit origin + `credentials: true`; `*` is forbidden with cookies  |
| Pre-save hook, `select: false`, toJSON | `apps/api/src/models/user.model.ts`                                                | hash on save; never load or serialize the hash                        |
| Virtual field                          | `apps/api/src/models/user.model.ts`                                                | `fullName`, computed on read, never stored                            |
| `.lean()` vs `populate()`              | `apps/api/src/services/auth.service.ts`                                            | lean = fast plain objects; populate = second query for refs           |
| DTO mapper (API Resource)              | `apps/api/src/schemas/user.schema.ts`                                              | explicit allow-list of fields, validated with Zod                     |
| Model registry gotcha                  | `apps/api/src/models/index.ts`                                                     | `populate()` finds models by name: register them all on connect       |
| Timing-safe login                      | `apps/api/src/services/auth.service.ts`                                            | dummy bcrypt compare so unknown emails take as long                   |

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

**Log in and use the session cookie**

```bash
# -c saves cookies to a jar, -b sends them back (like a browser would)
curl -si -c /tmp/jar -H 'Content-Type: application/json' \
  -d '{"email":"maria@acme.test","password":"password123"}' localhost:3000/auth/login
curl -s -b /tmp/jar localhost:3000/auth/me
curl -s localhost:3000/auth/me                      # 401: no cookie
curl -s -X POST -b /tmp/jar -c /tmp/jar localhost:3000/auth/logout
```

Look at the `Set-Cookie` header: `HttpOnly; SameSite=Lax`, plus `Secure` with the production image.

**Validation errors (and a NoSQL injection attempt):**

```bash
curl -s -H 'Content-Type: application/json' -d '{"email":{"$ne":null}}' localhost:3000/auth/login
```

You get a 400 with `fields` for `email` ("expected string, received object") and `password`.
The operator object never reaches MongoDB.

**Rate limiting:** run a wrong-password login 6 times. The 6th answer is a 429, with
`RateLimit-*` headers. Restart the API to reset the in-memory counters.

**Stack traces:** in dev (`docker compose up`) error bodies include `stack`. With the production
image (`docker compose -f docker-compose.yml up`) they don't.

**Request ids:** every response has an `X-Request-Id` header. Find it in `docker compose logs api`.

**A full review flow, and tenant isolation** (after `docker compose exec api npm run seed`):

```bash
login() { curl -s -c "/tmp/$1" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"password123\"}" localhost:3000/auth/login > /dev/null; }
login alice@acme.test; login maria@acme.test; login eve@acme.test; login gina@globex.test

# Alice (admin) creates and activates a cycle -> one review per managed employee
CYCLE=$(curl -s -b /tmp/alice@acme.test -H 'Content-Type: application/json' \
  -d '{"name":"Q4 2026","competencies":["Communication","Ownership"],"questions":["What went well?"]}' \
  localhost:3000/review-cycles | jq -r .id)
curl -s -X POST -b /tmp/alice@acme.test localhost:3000/review-cycles/$CYCLE/activate | jq .status

# Maria (manager) sees only her direct reports' reviews (Eve, Ethan), not Mike's team
curl -s -b /tmp/maria@acme.test "localhost:3000/reviews?cycleId=$CYCLE" | jq '.items[].employee'
REVIEW=$(curl -s -b /tmp/eve@acme.test localhost:3000/reviews | jq -r '.items[0].id')

# Eve (employee) can read her review but not edit it (403)
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH -b /tmp/eve@acme.test \
  -H 'Content-Type: application/json' -d '{"scores":[]}' localhost:3000/reviews/$REVIEW

# Gina (Globex) asks for an Acme review by its real id: 404, not 403
curl -s -b /tmp/gina@globex.test localhost:3000/reviews/$REVIEW | jq .error
```

Then try the same with feedback: `POST /feedback` as Eve about Emma, then list `/feedback` as
Maria, Mike and Alice and compare what each of them sees.

**See the tenant guard fail closed:** in `apps/api/src/services/user.service.ts`, remove
`organizationId` from the `getUser` filter and run `npm test`. Instead of quietly returning
another tenant's user, the query throws "Unscoped query on User".

## Laravel / FastAPI → Express cheat sheet

| Laravel / FastAPI                                           | Node / Express (this repo)                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| `public/index.php` + HTTP Kernel                            | `app.ts` (build the app) + `server.ts` (listen)                |
| `php artisan serve` / `uvicorn --reload`                    | `tsx watch src/server.ts`                                      |
| `.env` + `config/*.php` / pydantic-settings                 | Node `--env-file` + Zod schema in `config/env.ts`              |
| Monolog (`storage/logs`) / `logging`                        | Pino, JSON lines to stdout                                     |
| `Route::prefix()->group()` / `APIRouter`                    | `express.Router()` mounted with `app.use('/prefix', router)`   |
| PHP-FPM manages processes & shutdown                        | the Node process IS the server: handle SIGTERM yourself        |
| `RefreshDatabase` / pytest fixtures                         | `useTestDb()` helper + mongodb-memory-server                   |
| `$this->getJson()` / `TestClient`                           | Supertest `request(app).get()`                                 |
| HTTP Kernel `$middleware` array                             | `app.use()` calls in `app.ts`, run in registration order       |
| `FormRequest` / pydantic body model                         | `validate({ body, params, query })` middleware with Zod        |
| `abort(404)` / `HTTPException`                              | `throw new NotFoundError()` (services stay HTTP-agnostic)      |
| `App\Exceptions\Handler` / `@app.exception_handler`         | 4-argument error middleware in `middleware/error-handler.ts`   |
| `auth` middleware / `Depends(get_current_user)`             | `authenticate` middleware → `req.user`                         |
| `->middleware('role:admin')` / dependency with args         | `requireRole('admin')` middleware factory                      |
| `throttle:5,15` / slowapi                                   | express-rate-limit                                             |
| `config/cors.php` `supports_credentials` / `CORSMiddleware` | `cors({ origin, credentials: true })`                          |
| Eloquent `$hidden`                                          | `select: false` + `toJSON` transform                           |
| Eloquent accessor                                           | Mongoose virtual                                               |
| Eloquent `with('organization')`                             | `.populate('organizationId')`                                  |
| API Resource (`JsonResource`)                               | `toUserDto()` mapper validated by a Zod schema                 |
| Model factories / `DatabaseSeeder`                          | `tests/helpers/factories.ts` / `scripts/seed.ts`               |
| Service container / `Depends`                               | ES modules: Node's module cache makes every module a singleton |

## Interview questions

_Coming in phase 10._

## Build log

| Tag                 | Summary                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `phase-01-skeleton` | monorepo, TypeScript, lint, Express app, env, logging, Mongo/Redis, health, shutdown, Docker |
| `phase-02-auth`     | error handling, middleware chain, validate(), JWT cookie auth, roles, rate limit, seed users |

_Polished in phase 10._

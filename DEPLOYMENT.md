# Deployment

## Stack
- **Frontend**: Vercel (Services)
- **Backend**: Vercel (Services, Go persistent server)
- **Database**: Supabase (PostgreSQL, session pooler)

## Prerequisites
- Vercel account
- Supabase account
- Gemini API key
- Golf Course API key
- Clerk publishable key + JWKS URL

## Supabase Setup
1. Create a new project at supabase.com
2. From the project dashboard, click the **Connect** button
3. Select **Direct connection string**
4. Set connection method to **Session pooler**
5. Set type to **URI**
6. Copy the connection string and append `?sslmode=disable` — this is your `DATABASE_URL`

Example: `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres?sslmode=disable`

Migrations run automatically on backend startup via `db.RunMigrations`. Migration files live in `api/internal/db/migrations/` and are embedded into the binary at compile time via `//go:embed` — no filesystem access needed at runtime.

## Vercel Setup
1. New Project → import GitHub repo
2. Set **Framework Preset** to **Services**
3. Add the following environment variables before deploying (Vite bakes env vars at build time — they must exist before the first deploy):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase session pooler URI + `?sslmode=disable` |
| `GEMINI_API_KEY` | Gemini API key |
| `GOLF_COURSE_API_KEY` | Golf Course API key |
| `CLERK_JWKS_URL` | `https://<your-clerk-domain>/.well-known/jwks.json` |
| `VITE_API_URL` | `/api` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_...`) |

4. Deploy

## File Structure Notes

The monorepo has two services defined in `vercel.json`:
- `frontend/` — Vite + React, served at `/`
- `api/` — Go persistent server, served at `/api`

`go.mod` must stay in `api/` — Vercel uses it to detect the Go service. The Go entrypoint is `api/cmd/main.go`.

## Routing: How Vercel + Go Routes Work Together

Vercel routes requests with the `/api` prefix to the Go service, **and strips the prefix** before forwarding. So a browser request to `/api/rounds` arrives at the Go server as `/rounds`.

This means:
- Go mux routes are registered **without** the `/api` prefix (e.g. `GET /rounds`, not `GET /api/rounds`)
- The frontend `VITE_API_URL=/api` handles the prefix on the client side
- Locally, `VITE_API_URL=http://localhost:8080` bypasses Vercel entirely

## Migrations: Why `//go:embed`

The Go binary is compiled and run from an unpredictable working directory on Vercel. Relative paths like `"migrations"` don't resolve at runtime. Migration SQL files are embedded into the binary at compile time using Go's `//go:embed` directive in `api/internal/db/db.go`, making the binary fully self-contained.

Migration files must live in `api/internal/db/migrations/` — `//go:embed` can only embed files in the same directory tree as the Go file using the directive.

## Local Dev
1. Copy `.env.example` to `.env` and fill in values
2. Set `VITE_API_URL=http://localhost:8080` in `frontend/.env`
3. Start Postgres: `docker-compose up -d`
4. Start API server: `cd api && go run ./cmd/main.go`
5. Start frontend: `cd frontend && npm run dev`

## Notes
- CORS is configured via `CORS_ALLOWED_ORIGINS` env var (defaults to `http://localhost:5173`)
- Clerk JWT verification uses the JWKS URL — no Clerk secret key needed on the backend
- `godotenv` is used locally only; on Vercel env vars are injected natively and no `.env` file exists — the load failure is a soft warning, not a crash

## Keeping Supabase awake

The Go service is persistent (no cold starts), but Supabase's free tier pauses a project after about a week of no database activity. `vercel.json` defines a daily [Vercel Cron](https://vercel.com/docs/cron-jobs) that hits `GET /api/health`, which pings the pool (`pool.Ping` in `api/cmd/main.go`) before responding.

```json
"crons": [{ "path": "/api/health", "schedule": "0 12 * * *" }]
```

`/health` is registered on a separate root mux outside `authMiddleware.Wrap`, since Vercel Cron requests carry no Clerk token and would otherwise get a 401. Hobby plan allows up to 2 crons per project at daily frequency, so no plan upgrade is needed.

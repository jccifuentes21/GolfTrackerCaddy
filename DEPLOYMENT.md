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

## Supabase Setup
1. Create a new project at supabase.com
2. From the project dashboard, click the **Connect** button
3. Select **Direct connection string**
4. Set connection method to **Session pooler**
5. Set type to **URI**
6. Copy the connection string and append `?sslmode=disable` — this is your `DATABASE_URL`

Example: `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres?sslmode=disable`

Migrations run automatically on backend startup via `db.RunMigrations`.

## Vercel Setup
1. New Project → import GitHub repo
2. Set **Framework Preset** to **Services**
3. Add the following environment variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase session pooler URI |
| `GEMINI_API_KEY` | Gemini API key |
| `GOLF_COURSE_API_KEY` | Golf Course API key |
| `VITE_API_URL` | `/api` |

4. Deploy

## Local Dev
1. Copy `.env.example` to `.env` and fill in values
2. Start Postgres: `docker-compose up -d`
3. Start backend: `cd backend && go run ./cmd/main.go`
4. Start frontend: `cd frontend && npm run dev`

## Notes
- Backend routes are all prefixed with `/api` (e.g. `/api/rounds`)
- CORS is configured via `CORS_ALLOWED_ORIGINS` env var (defaults to `http://localhost:5173`)
- `go.mod` must stay in `backend/` — Vercel uses it to detect the Go service

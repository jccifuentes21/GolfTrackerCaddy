# Golf Tracker Caddy — Backend

Go REST API for tracking golf rounds with AI-powered post-round analysis.

## API Endpoints Overview

**Public:**

- `GET /courses/search` — Search for golf courses via the Golf Course API
- `POST /courses` — Save a selected course to the local database

**Authenticated (Clerk JWT required — coming soon):**

- `POST /rounds` — Create a new round
- `GET /rounds` — List all rounds for the authenticated user
- `GET /rounds/{id}` — Get a single round by ID
- `POST /rounds/{roundID}/holes` — Save a hole entry for a round
- `GET /rounds/{roundID}/holes` — List all holes for a round

---

## API Endpoints Detail

### GET /courses/search

Search for golf courses by name. Hits the Golf Course API and returns matching results. Does **not** save to the database.

**Query Parameters:**
- `q` — search string (required)

**Example:**
```bash
curl "http://localhost:8080/courses/search?q=san+carlos"
```

**Response:** Full Golf Course API response including tees and per-hole data.

---

### POST /courses

Save a selected course (and all its tees + holes) to the database. Called automatically when a user selects a course from search results. Safe to call multiple times — duplicate tees and holes are ignored via `ON CONFLICT DO NOTHING`.

**Request Body:** Full `APICourse` object from the search response.

**Example:**
```bash
curl -X POST http://localhost:8080/courses \
  -H "Content-Type: application/json" \
  -d '{ ...APICourse object... }'
```

**Status Codes:**
- `201 Created` — course saved successfully
- `400 Bad Request` — invalid request body
- `500 Internal Server Error` — server error

---

### POST /rounds

Create a new round for a user.

**Request Body:**
```json
{
  "tee_id": "uuid of the tee played",
  "user_id": "clerk user id",
  "date": "2026-04-22",
  "input_mode": "live | front_back | full"
}
```

**Response:** Created round object including generated `id`.

**Status Codes:**
- `201 Created`
- `400 Bad Request` — missing fields or invalid date format (must be `YYYY-MM-DD`)
- `500 Internal Server Error`

---

### GET /rounds

List all rounds. Will be scoped to the authenticated user once Clerk middleware is wired up.

**Response:** Array of round objects.

---

### GET /rounds/{id}

Get a single round by ID.

**Status Codes:**
- `200 OK`
- `404 Not Found`

---

### POST /rounds/{roundID}/holes

Save a single hole entry for a round.

**Request Body:**
```json
{
  "hole_number": 1,
  "score": 5,
  "fairway_hit": true,
  "gir": false,
  "putts": 2,
  "miss_direction": "left | right | short | none"
}
```

**Response:** Created hole object.

**Status Codes:**
- `201 Created`
- `400 Bad Request`
- `500 Internal Server Error`

---

### GET /rounds/{roundID}/holes

List all holes for a round, ordered by hole number ascending.

---

## Environment Variables

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/golftrackercaddy?sslmode=disable
GOLF_COURSE_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
PORT=8080
```

## Local Development

Requires Docker Desktop.

**Start the database:**
```bash
docker compose up -d
```

**Run the server:**
```bash
cd backend
go run cmd/main.go
```

Migrations run automatically on startup.

## Stack

- **Language:** Go
- **Database:** PostgreSQL via `pgx`
- **Auth:** Clerk (coming soon)
- **AI:** Claude API via Anthropic Go SDK (coming soon)
- **Deploy:** Railway

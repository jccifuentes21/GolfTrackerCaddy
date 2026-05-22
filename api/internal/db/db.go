// Package db holds database connection and migration helpers.
//
// Keeping these concerns outside main makes startup code easier to read and keeps
// database setup reusable if tests or command-line tools need it later.
package db

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations
var migrationsFS embed.FS

func Connect(databaseURL string) (*pgxpool.Pool, error) {
	// A pool is preferred for web servers because many requests can need the DB at once.
	// pgxpool handles opening, reusing, and closing physical PostgreSQL connections.
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		// %w wraps the original error so callers can preserve the low-level cause.
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}
	return pool, nil
}

func RunMigrations(pool *pgxpool.Pool) error {
	ctx := context.Background()

	// schema_migrations is a simple ledger. Each filename is recorded after it runs,
	// which makes startup migrations idempotent across app restarts.
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// Read from the embedded FS — files are baked into the binary at compile time,
	// so this works regardless of the working directory at runtime.
	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	// Migration filenames are numbered, so lexical sorting gives deterministic execution order:
	// 001 before 002 before 003, etc.
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		// Parameter placeholders like $1 keep values separate from SQL text.
		// That is the core SQL injection defense when user input is involved.
		var exists bool
		err := pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = $1)`, entry.Name()).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check if migration exists: %w", err)
		}
		if exists {
			continue
		}

		content, err := fs.ReadFile(migrationsFS, "migrations/"+entry.Name())
		if err != nil {
			return fmt.Errorf("failed to read migration file: %w", err)
		}
		_, err = pool.Exec(ctx, string(content))
		if err != nil {
			return fmt.Errorf("failed to run migration: %w", err)
		}

		// Record only after the SQL succeeds. If a migration fails, the next startup can retry it.
		_, err = pool.Exec(ctx, `INSERT INTO schema_migrations (filename) VALUES ($1)`, entry.Name())
		if err != nil {
			return fmt.Errorf("failed to record migration: %w", err)
		}
	}
	return nil
}

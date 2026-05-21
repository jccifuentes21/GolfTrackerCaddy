package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// HoleStore owns SQL for user-entered hole scores and stats.
// It stores per-round performance data, not static course-hole metadata.
type HoleStore struct {
	db *pgxpool.Pool
}

func NewHoleStore(db *pgxpool.Pool) *HoleStore {
	return &HoleStore{db: db}
}

func (s *HoleStore) Create(ctx context.Context, h *model.Hole) error {
	// This is an upsert: first entry inserts, later edits for the same round and hole update stats.
	// The UNIQUE (round_id, hole_number) constraint in the migration is what makes this possible.
	_, err := s.db.Exec(ctx, `
		INSERT INTO holes (id, round_id, hole_number, score, fairway_hit, fairway_miss, GIR, putts, green_miss, penalties)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (round_id, hole_number) DO UPDATE SET
			score          = EXCLUDED.score,
			fairway_hit    = EXCLUDED.fairway_hit,
			fairway_miss   = EXCLUDED.fairway_miss,
			GIR            = EXCLUDED.GIR,
			putts          = EXCLUDED.putts,
			green_miss = EXCLUDED.green_miss,
			penalties      = EXCLUDED.penalties
	`, h.ID, h.RoundID, h.HoleNumber, h.Score, h.FairwayHit, h.FairwayMiss, h.GIR, h.Putts, h.GreenMiss, h.Penalties)
	return err
}

func (s *HoleStore) ListByRound(ctx context.Context, roundID string) ([]model.Hole, error) {
	// The frontend needs holes in scorecard order, so the store guarantees that ordering.
	rows, err := s.db.Query(ctx, `
		SELECT id, round_id, hole_number, score, fairway_hit, fairway_miss, GIR, putts, green_miss, penalties
		FROM holes
		WHERE round_id = $1
		ORDER BY hole_number ASC
	`, roundID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// make(..., 0) instead of var holes []model.Hole — a nil slice encodes to JSON null,
	// an empty (non-nil) slice encodes to []. The frontend expects [] for zero results.
	holes := make([]model.Hole, 0)
	for rows.Next() {
		var h model.Hole
		err := rows.Scan(&h.ID, &h.RoundID, &h.HoleNumber, &h.Score, &h.FairwayHit, &h.FairwayMiss, &h.GIR, &h.Putts, &h.GreenMiss, &h.Penalties)
		if err != nil {
			return nil, err
		}
		holes = append(holes, h)
	}
	return holes, nil
}

package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

type HoleStore struct {
	db *pgxpool.Pool
}

func NewHoleStore(db *pgxpool.Pool) *HoleStore {
	return &HoleStore{db: db}
}

func (s *HoleStore) Create(ctx context.Context, h *model.Hole) error {
	_, err := s.db.Exec(ctx, `
		INSERT INTO holes (id, round_id, hole_number, score, fairway_hit, GIR, putts, miss_direction) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, h.ID, h.RoundID, h.HoleNumber, h.Score, h.FairwayHit, h.GIR, h.Putts, h.MissDirection)
	return err
}

func (s *HoleStore) ListByRound(ctx context.Context, roundID string) ([]model.Hole, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, round_id, hole_number, score, fairway_hit, GIR, putts, miss_direction 
		FROM holes 
		WHERE round_id = $1
		ORDER BY hole_number ASC
	`, roundID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var holes []model.Hole
	for rows.Next() {
		var h model.Hole
		err := rows.Scan(&h.ID, &h.RoundID, &h.HoleNumber, &h.Score, &h.FairwayHit, &h.GIR, &h.Putts, &h.MissDirection)
		if err != nil {
			return nil, err
		}
		holes = append(holes, h)
	}
	return holes, nil
}

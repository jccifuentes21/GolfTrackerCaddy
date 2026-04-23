package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

type RoundStore struct {
	db *pgxpool.Pool
}

func NewRoundStore(db *pgxpool.Pool) *RoundStore {
	return &RoundStore{db: db}
}

func (s *RoundStore) Create(ctx context.Context, r *model.Round) error {
	_, err := s.db.Exec(ctx, `
		INSET INTO rounds (id, tee_id, user_id, date, input_mode) 
		VALUES ($1, $2, $3, $4, $5)
	`, r.ID, r.TeeID, r.UserID, r.Date, r.InputMode)
	return err
}

func (s *RoundStore) GetByID(ctx context.Context, id string) (*model.Round, error) {
	r := &model.Round{}
	err := s.db.QueryRow(ctx, `
		SELECT id, tee_id, user_id, date, input_mode 
		FROM rounds 
		WHERE id = $1
	`, id).Scan(&r.ID, &r.TeeID, &r.UserID, &r.Date, &r.InputMode)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (s *RoundStore) List(ctx context.Context) ([]model.Round, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, tee_id, user_id, date, input_mode 
		FROM rounds
		ORDER BY date DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rounds []model.Round
	for rows.Next() {
		var r model.Round
		err := rows.Scan(&r.ID, &r.TeeID, &r.UserID, &r.Date, &r.InputMode)
		if err != nil {
			return nil, err
		}
		rounds = append(rounds, r)
	}
	return rounds, nil

}

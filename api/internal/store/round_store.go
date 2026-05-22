package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// RoundStore owns SQL for rounds, which are the user's played sessions.
// It depends only on the database pool and returns domain models to the service layer.
type RoundStore struct {
	db *pgxpool.Pool
}

func NewRoundStore(db *pgxpool.Pool) *RoundStore {
	return &RoundStore{db: db}
}

func (s *RoundStore) Create(ctx context.Context, r *model.Round) error {
	// Rounds reference tee_id, not course_id, because scoring context depends on the selected tees.
	_, err := s.db.Exec(ctx, `
		INSERT INTO rounds (id, tee_id, user_id, course_name, date, input_mode)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, r.ID, r.TeeID, r.UserID, r.CourseName, r.Date, r.InputMode)
	return err
}

func (s *RoundStore) GetByID(ctx context.Context, id string) (*model.Round, error) {
	r := &model.Round{}
	// QueryRow is used when the code expects at most one result.
	// If no row exists, pgx returns pgx.ErrNoRows through Scan.
	err := s.db.QueryRow(ctx, `
		SELECT id, tee_id, user_id, course_name, date, input_mode, created_at
		FROM rounds
		WHERE id = $1
	`, id).Scan(&r.ID, &r.TeeID, &r.UserID, &r.CourseName, &r.Date, &r.InputMode, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (s *RoundStore) List(ctx context.Context, userID string) ([]model.Round, error) {
	// Listing newest rounds first matches the dashboard mental model: recent play is most relevant.
	rows, err := s.db.Query(ctx, `
		SELECT id, tee_id, user_id, course_name, date, input_mode, created_at
		FROM rounds
		WHERE user_id = $1
		ORDER BY date DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rounds := make([]model.Round, 0)
	for rows.Next() {
		var r model.Round
		err := rows.Scan(&r.ID, &r.TeeID, &r.UserID, &r.CourseName, &r.Date, &r.InputMode, &r.CreatedAt)
		if err != nil {
			return nil, err
		}
		rounds = append(rounds, r)
	}
	return rounds, nil
}

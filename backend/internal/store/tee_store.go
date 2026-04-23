package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

type TeeStore struct {
	db *pgxpool.Pool
}

func NewTeeStore(db *pgxpool.Pool) *TeeStore {
	return &TeeStore{db: db}
}

func (s *TeeStore) Create(ctx context.Context, t *model.Tee) (string, error) {
	var id string
	err := s.db.QueryRow(ctx, `
			INSERT INTO tees (id, course_id, tee_name, course_rating, slope_rating, total_yards, par)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (course_id, tee_name) DO UPDATE SET tee_name = EXCLUDED.tee_name
			RETURNING id
	`, t.ID, t.CourseID, t.TeeName, t.CourseRating, t.SlopeRating, t.TotalYards, t.Par).Scan(&id)
	return id, err
}

func (s *TeeStore) ListByCourse(ctx context.Context, courseID string) ([]model.Tee, error) {

	//pgx uses Query and rows becomes an active connection to the database. It has to be closed after use.
	rows, err := s.db.Query(ctx, `
		SELECT id, course_id, tee_name, course_rating, slope_rating, total_yards, par, created_at 
		FROM tees 
		WHERE course_id = $1
	`, courseID)
	if err != nil {
		return nil, err
	}
	//defer === finally in a try/catch block
	defer rows.Close()

	var tees []model.Tee
	//rows.Next() is used to iterate over the rows.
	for rows.Next() {
		var t model.Tee
		err := rows.Scan(&t.ID, &t.CourseID, &t.TeeName, &t.CourseRating, &t.SlopeRating, &t.TotalYards, &t.Par, &t.CreatedAt)
		if err != nil {
			return nil, err
		}
		tees = append(tees, t)
	}
	return tees, nil
}

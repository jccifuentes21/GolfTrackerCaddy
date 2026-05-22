package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// TeeStore owns all SQL for tee records.
// A tee belongs to a course, but it gets its own table because yardage, par, rating, and slope vary by tee.
type TeeStore struct {
	db *pgxpool.Pool
}

func NewTeeStore(db *pgxpool.Pool) *TeeStore {
	return &TeeStore{db: db}
}

func (s *TeeStore) Create(ctx context.Context, t *model.Tee) (string, error) {
	var id string
	// The unique constraint is (course_id, tee_name), so this upsert deduplicates tees within a course.
	// RETURNING id gives the service the database id whether the row was inserted or already existed.
	err := s.db.QueryRow(ctx, `
			INSERT INTO tees (id, course_id, tee_name, course_rating, slope_rating, total_yards, par)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (course_id, tee_name) DO UPDATE SET tee_name = EXCLUDED.tee_name
			RETURNING id
	`, t.ID, t.CourseID, t.TeeName, t.CourseRating, t.SlopeRating, t.TotalYards, t.Par).Scan(&id)
	return id, err
}

// GetByID fetches one tee row. Dashboard and summary screens use this for par context.
func (s *TeeStore) GetByID(ctx context.Context, id string) (*model.Tee, error) {
	var t model.Tee
	err := s.db.QueryRow(ctx, `
		SELECT id, course_id, tee_name, course_rating, slope_rating, total_yards, par, created_at
		FROM tees
		WHERE id = $1
	`, id).Scan(&t.ID, &t.CourseID, &t.TeeName, &t.CourseRating, &t.SlopeRating, &t.TotalYards, &t.Par, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *TeeStore) ListByCourse(ctx context.Context, courseID string) ([]model.Tee, error) {

	// Query returns a cursor-like Rows value. Closing it returns the connection to the pool.
	rows, err := s.db.Query(ctx, `
		SELECT id, course_id, tee_name, course_rating, slope_rating, total_yards, par, created_at 
		FROM tees 
		WHERE course_id = $1
	`, courseID)
	if err != nil {
		return nil, err
	}
	// defer schedules cleanup at function exit, even when an earlier return happens.
	defer rows.Close()

	tees := make([]model.Tee, 0)
	// Each call to Next advances to one row, then Scan maps that row into the struct.
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

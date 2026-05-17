package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// CourseHoleStore owns SQL for static hole metadata tied to a tee set.
type CourseHoleStore struct {
	db *pgxpool.Pool
}

// NewCourseHoleStore receives the shared DB pool from main.
func NewCourseHoleStore(db *pgxpool.Pool) *CourseHoleStore {
	return &CourseHoleStore{db: db}
}

// CreateBatch saves the static 1-18 hole layout for a tee.
// This currently loops individual inserts; a future improvement could use a transaction or pgx batch.
func (s *CourseHoleStore) CreateBatch(ctx context.Context, holes []model.CourseHole) error {
	for _, h := range holes {
		// The unique constraint on (tee_id, hole_number) makes this safe to call again
		// if the same course is selected more than once.
		_, err := s.db.Exec(ctx, `
			INSERT INTO course_holes (id, tee_id, hole_number, par, yardage, handicap)
  		VALUES ($1, $2, $3, $4, $5, $6)
  		ON CONFLICT (tee_id, hole_number) DO NOTHING
		`, h.ID, h.TeeID, h.HoleNumber, h.Par, h.Yardage, h.Handicap)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *CourseHoleStore) ListByTee(ctx context.Context, teeID string) ([]model.CourseHole, error) {
	// ORDER BY keeps hole data in scorecard order, which is easier for the frontend to render directly.
	rows, err := s.db.Query(ctx, `
		SELECT id, tee_id, hole_number, par, yardage, handicap 
		FROM course_holes 
		WHERE tee_id = $1
		ORDER BY hole_number ASC
	`, teeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	holes := make([]model.CourseHole, 0)
	for rows.Next() {
		var h model.CourseHole
		err := rows.Scan(&h.ID, &h.TeeID, &h.HoleNumber, &h.Par, &h.Yardage, &h.Handicap)
		if err != nil {
			return nil, err
		}
		holes = append(holes, h)
	}
	return holes, nil
}

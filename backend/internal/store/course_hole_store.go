package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// Struct defines what the store needs to do its job
type CourseHoleStore struct {
	db *pgxpool.Pool
}

// The constructor creates an instance of the defined struct
func NewCourseHoleStore(db *pgxpool.Pool) *CourseHoleStore {
	return &CourseHoleStore{db: db}
}

// CreateBatch creates a batch of course holes in a single transaction
func (s *CourseHoleStore) CreateBatch(ctx context.Context, holes []model.CourseHole) error {
	for _, h := range holes {
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

	var holes []model.CourseHole
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

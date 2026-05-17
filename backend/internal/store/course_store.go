package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// CourseStore is the persistence boundary for courses.
// Keeping SQL here means handlers and services can work with model.Course instead of database rows.
type CourseStore struct {
	db *pgxpool.Pool
}

// NewCourseStore uses dependency injection: main creates the shared DB pool, then passes it in.
func NewCourseStore(db *pgxpool.Pool) *CourseStore {
	return &CourseStore{db: db}
}

func (s *CourseStore) Create(ctx context.Context, c *model.Course) error {

	// ON CONFLICT makes saving the same external course idempotent.
	// That matters because users can select a course that already exists in the local cache.
	_, err := s.db.Exec(ctx, `
	  INSERT INTO courses (id, club_name, course_name, address, city, state, country)
 		VALUES ($1, $2, $3, $4, $5, $6, $7)
  	ON CONFLICT (id) DO NOTHING
	`, c.ID, c.ClubName, c.CourseName, c.Address, c.City, c.State, c.Country)
	return err
}

func (s *CourseStore) GetByID(ctx context.Context, id string) (*model.Course, error) {

	c := &model.Course{}

	// Scan copies SQL columns into Go fields in the exact order listed in SELECT.
	err := s.db.QueryRow(ctx, `
		SELECT id, club_name, course_name, address, city, state, country, created_at FROM courses WHERE id = $1
	`, id).Scan(&c.ID, &c.ClubName, &c.CourseName, &c.Address, &c.City, &c.State, &c.Country, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *CourseStore) Search(ctx context.Context, query string) ([]model.Course, error) {

	// ILIKE is PostgreSQL's case-insensitive LIKE.
	// Wrapping the query in % means "contains this text anywhere", not just a prefix match.
	rows, err := s.db.Query(ctx, `
		SELECT id, club_name, course_name, address, city, state, country, created_at 
		FROM courses 
		WHERE club_name ILIKE $1 OR course_name ILIKE $1
	`, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	courses := make([]model.Course, 0)
	// rows.Next streams results one row at a time, which scales better than loading raw DB rows at once.
	for rows.Next() {
		var c model.Course
		err := rows.Scan(&c.ID, &c.ClubName, &c.CourseName, &c.Address, &c.City, &c.State, &c.Country, &c.CreatedAt)
		if err != nil {
			return nil, err
		}
		courses = append(courses, c)
	}
	return courses, nil
}

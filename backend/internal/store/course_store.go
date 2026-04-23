package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

type CourseStore struct {
	db *pgxpool.Pool
}

func NewCourseStore(db *pgxpool.Pool) *CourseStore {
	return &CourseStore{db: db}
}

func (s *CourseStore) Create(ctx context.Context, c *model.Course) error {

	_, err := s.db.Exec(ctx, `
	  INSERT INTO courses (id, club_name, course_name, address, city, state, country)
 		VALUES ($1, $2, $3, $4, $5, $6, $7)
  	ON CONFLICT (id) DO NOTHING
	`, c.ID, c.ClubName, c.CourseName, c.Address, c.City, c.State, c.Country)
	return err
}

func (s *CourseStore) GetByID(ctx context.Context, id string) (*model.Course, error) {

	c := &model.Course{}

	//Scan is used to map a sql row to a go struct
	err := s.db.QueryRow(ctx, `
		SELECT id, club_name, course_name, address, city, state, country, created_at FROM courses WHERE id = $1
	`, id).Scan(&c.ID, &c.ClubName, &c.CourseName, &c.Address, &c.City, &c.State, &c.Country, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *CourseStore) Search(ctx context.Context, query string) ([]model.Course, error) {

	//ILIKE = case insensitive LIKE; used for searching by club name or course name
	//%query% means "contains this string anywhere"
	rows, err := s.db.Query(ctx, `
		SELECT id, club_name, course_name, address, city, state, country, created_at 
		FROM courses 
		WHERE club_name ILIKE $1 OR course_name ILIKE $1
	`, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []model.Course
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

package model

import "time"

// Tee represents one playable tee set for a course.
// Rating, slope, yardage, and par belong here because they change by tee, not just by course.
type Tee struct {
	ID           string    `json:"id"`
	CourseID     string    `json:"course_id"`
	TeeName      string    `json:"tee_name"`
	CourseRating float64   `json:"course_rating"`
	SlopeRating  int       `json:"slope_rating"`
	TotalYards   int       `json:"total_yards"`
	Par          int       `json:"par"`
	CreatedAt    time.Time `json:"created_at"`
}

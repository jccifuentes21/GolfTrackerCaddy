package model

import "time"

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

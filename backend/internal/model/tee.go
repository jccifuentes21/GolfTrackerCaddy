package model

import "time"

type Tee struct {
	ID           string
	CourseID     string
	TeeName      string
	CourseRating float64
	SlopeRating  int
	TotalYards   int
	Par          int
	CreatedAt    time.Time
}

package model

import "time"

// Round is the parent record for one played round.
// It references Tee instead of Course because score context depends on which tee set was played.
type Round struct {
	ID         string    `json:"id"`
	TeeID      string    `json:"tee_id"`
	UserID     string    `json:"user_id"`
	CourseName string    `json:"course_name"` // Denormalized for list views so the dashboard does not need a course join.
	Date       time.Time `json:"date"`
	InputMode  string    `json:"input_mode"`
	CreatedAt  time.Time `json:"created_at"`
}

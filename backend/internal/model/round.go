package model

import "time"

// Round is a golf round aggregate.
type Round struct {
	ID        string    `json:"id"`
	TeeID     string    `json:"tee_id"`
	UserID    string    `json:"user_id"`
	Date      time.Time `json:"date"`
	InputMode string    `json:"input_mode"`
	CreatedAt time.Time `json:"created_at"`
}

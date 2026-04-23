package model

import "time"

// Round is a golf round aggregate.
type Round struct {
	ID        string
	TeeID     string
	UserID    string
	Date      time.Time
	InputMode string
	CreatedAt time.Time
}

package model

import "time"

// Course is cached course identity and location data from the external Golf Course API.
// It is intentionally separate from Tee because one course can have many playable tee sets.
type Course struct {
	ID         string    `json:"id"`
	ClubName   string    `json:"club_name"`
	CourseName string    `json:"course_name"`
	Address    string    `json:"address"`
	City       string    `json:"city"`
	State      string    `json:"state"`
	Country    string    `json:"country"`
	CreatedAt  time.Time `json:"created_at"`
}

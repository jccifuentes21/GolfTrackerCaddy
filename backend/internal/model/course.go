package model

import "time"

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

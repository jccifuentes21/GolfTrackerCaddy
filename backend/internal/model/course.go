package model

import "time"

type Course struct {
	ID         string
	ClubName   string
	CourseName string
	Address    string
	City       string
	State      string
	Country    string
	CreatedAt  time.Time
}

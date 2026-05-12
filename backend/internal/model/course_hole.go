package model

type CourseHole struct {
	ID         string `json:"id"`
	TeeID      string `json:"tee_id"`
	HoleNumber int    `json:"hole_number"`
	Par        int    `json:"par"`
	Yardage    int    `json:"yardage"`
	Handicap   int    `json:"handicap"`
}

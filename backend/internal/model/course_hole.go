package model

// CourseHole is static hole metadata for a tee set.
// This is different from Hole, which stores what the user scored during a specific round.
type CourseHole struct {
	ID         string `json:"id"`
	TeeID      string `json:"tee_id"`
	HoleNumber int    `json:"hole_number"`
	Par        int    `json:"par"`
	Yardage    int    `json:"yardage"`
	Handicap   int    `json:"handicap"`
}

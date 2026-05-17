package model

// Hole is one hole scored within a round.
// These are user-entered performance stats, so they are stored separately from static CourseHole data.
type Hole struct {
	ID            string `json:"id"`
	RoundID       string `json:"round_id"`
	HoleNumber    int    `json:"hole_number"`
	Score         int    `json:"score"`
	FairwayHit    bool   `json:"fairway_hit"`
	GIR           bool   `json:"gir"`
	Putts         int    `json:"putts"`
	MissDirection string `json:"miss_direction"`
}

package model

// Hole is one hole scored within a round.
// These are user-entered performance stats, so they are stored separately from static CourseHole data.
type Hole struct {
	ID          string `json:"id"`
	RoundID     string `json:"round_id"`
	HoleNumber  int    `json:"hole_number"`
	Score       int    `json:"score"`
	FairwayHit  bool   `json:"fairway_hit"`
	FairwayMiss string `json:"fairway_miss"` // left, right, or none. Only meaningful when fairway_hit is false.
	GIR         bool   `json:"gir"`
	Putts       int    `json:"putts"`
	GreenMiss   string `json:"green_miss"` // left, right, short, long, or none. Only meaningful when gir is false.
	Penalties   int    `json:"penalties"`  // Stroke-and-distance, lateral, or unplayable penalty strokes.
}

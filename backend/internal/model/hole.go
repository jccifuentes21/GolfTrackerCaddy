package model

// Hole is one hole scored within a round.
type Hole struct {
	ID            string
	RoundID       string
	HoleNumber    int
	Score         int
	FairwayHit    bool
	GIR           bool
	Putts         int
	MissDirection string
}

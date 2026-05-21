package ai

import (
	"fmt"
	"strings"

	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// buildPrompt constructs the caddy analysis prompt from round data.
// Shared by both GeminiService and ClaudeService so the output is identical regardless of backend.
func buildPrompt(round *model.Round, holes []model.Hole, courseHoles []model.CourseHole) string {
	// Map course holes by hole number for O(1) par lookup.
	parByHole := make(map[int]model.CourseHole)
	for _, ch := range courseHoles {
		parByHole[ch.HoleNumber] = ch
	}

	var sb strings.Builder
	for _, h := range holes {
		ch := parByHole[h.HoleNumber]
		diff := h.Score - ch.Par

		diffStr := "E"
		if diff > 0 {
			diffStr = fmt.Sprintf("+%d", diff)
		} else if diff < 0 {
			diffStr = fmt.Sprintf("%d", diff)
		}

		fmt.Fprintf(&sb, "Hole %d (Par %d, %d yds): Score %d (%s), Fairway: %s, Fairway Miss: %s, GIR: %t, Green Miss: %s, Putts: %d, Penalties: %d\n",
			h.HoleNumber, ch.Par, ch.Yardage,
			h.Score, diffStr,
			boolToStr(h.FairwayHit, "Hit", "Missed"),
			h.FairwayMiss,
			h.GIR,
			h.GreenMiss,
			h.Putts,
			h.Penalties,
		)
	}

	return fmt.Sprintf(
`You are a professional experienced golf caddy reviewing a player's round. Analyze the following hole-by-hole data and provide an honest, direct debrief in plain text with no markdown formatting.

Cover three things:
1. A brief overview of the round (total score vs par, general shape).
2. Patterns you notice — where strokes are being lost or saved (off the tee, approach, putting, penalties).
3. One specific thing to work on before the next round.

Keep the tone like a knowledgeable caddy — honest, golf-literate, direct. No generic advice.

Round date: %s
Holes played: %d

%s`,
		round.Date.Format("2006-01-02"),
		len(holes),
		sb.String(),
	)
}

// boolToStr makes the prompt readable — "Hit"/"Missed" instead of "true"/"false".
func boolToStr(b bool, trueVal, falseVal string) string {
	if b {
		return trueVal
	}
	return falseVal
}

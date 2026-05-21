package ai

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// Service wraps the Anthropic client so the rest of the app can request AI analysis
// without knowing which model or SDK is used underneath.
type Service struct {
	client anthropic.Client
}

// NewService reads ANTHROPIC_API_KEY from the environment automatically via the SDK.
func NewService() *Service {
	client := anthropic.NewClient()
	return &Service{client: client}
}

// Analyze sends round and hole data to Claude and returns a plain-text analysis.
// Keeping the return type as string means handlers stay decoupled from SDK types.
func (s *Service) Analyze(ctx context.Context, round *model.Round, holes []model.Hole, courseHoles []model.CourseHole) (string, error) {

	//Turning courseHoles slice into a map keyed by hole number for O(1) lookup.
	//the map shape is [hole number] -> course hole record, hence the int -> model.CourseHole.
	parByHole := make(map[int]model.CourseHole)
	// Iterate over courseHoles and populate the map.
	for _, ch := range courseHoles {
		parByHole[ch.HoleNumber] = ch
	}

	//Use string builder to efficiently concatenate the hole data, bc concatenating strings in a loop with go creates a new string each time, whereas builder writes to a buffer and only allocates once at the end.
	var sb strings.Builder

	for _, h := range holes {
		ch := parByHole[h.HoleNumber]
		// Calculate the score difference between the user's score and the course par for this hole.
		diff := h.Score - ch.Par

		// "E" for even par — golf convention. Positive diff gets an explicit + prefix.
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

	response, err := s.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeHaiku4_5,
		MaxTokens: 1024,
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(
				fmt.Sprintf(
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
				))),
		},
	})
	if err != nil {
		var apiErr *anthropic.Error
		if errors.As(err, &apiErr) {
			log.Printf("Anthropic API error %d: %s", apiErr.StatusCode, apiErr.RawJSON())
		}
		return "", fmt.Errorf("Claude API call failed: %w", err)
	}

	// Content is a slice because the API supports multiple content blocks (text, tool calls, etc.).
	// A text-only response always has exactly one block so [0] is safe here.
	return response.Content[0].Text, nil
}

// boolToStr makes the prompt readable — "Hit"/"Missed" instead of "true"/"false".
func boolToStr(b bool, trueVal, falseVal string) string {
	if b {
		return trueVal
	}
	return falseVal
}

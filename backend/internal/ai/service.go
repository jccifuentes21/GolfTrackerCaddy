package ai

import (
	"context"

	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// Analyzer is the shared interface for AI analysis backends.
// Both GeminiService and ClaudeService implement it — swap NewService() to switch.
type Analyzer interface {
	Analyze(ctx context.Context, round *model.Round, holes []model.Hole, courseHoles []model.CourseHole) (string, error)
}

// NewService returns the active AI backend.
// To switch to Claude: return NewClaudeService()
func NewService() Analyzer {
	return NewGeminiService()
	//return NewClaudeService()
}

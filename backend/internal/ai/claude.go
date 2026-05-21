package ai

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
)

// ClaudeService implements Analyzer using Anthropic's Claude API.
// Requires ANTHROPIC_API_KEY in the environment and a funded account at console.anthropic.com.
type ClaudeService struct {
	client anthropic.Client
}

// NewClaudeService reads ANTHROPIC_API_KEY from the environment automatically via the SDK.
func NewClaudeService() *ClaudeService {
	return &ClaudeService{client: anthropic.NewClient()}
}

func (s *ClaudeService) Analyze(ctx context.Context, round *model.Round, holes []model.Hole, courseHoles []model.CourseHole) (string, error) {
	prompt := buildPrompt(round, holes, courseHoles)

	response, err := s.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeHaiku4_5_20251001,
		MaxTokens: 1024,
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(prompt)),
		},
	})
	if err != nil {
		return "", fmt.Errorf("Claude API call failed: %w", err)
	}

	// Content[0] is always a text block for a plain text prompt with no tools.
	return response.Content[0].Text, nil
}

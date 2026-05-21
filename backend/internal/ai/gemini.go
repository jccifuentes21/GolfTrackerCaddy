package ai

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/google/generative-ai-go/genai"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
	"google.golang.org/api/option"
)

// GeminiService implements Analyzer using Google's Gemini API.
// Free tier: 15 req/min, 1M tokens/day on gemini-2.0-flash.
type GeminiService struct {
	client *genai.Client
}

// NewGeminiService reads GEMINI_API_KEY from the environment.
func NewGeminiService() *GeminiService {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		log.Fatalf("Failed to create Gemini client: %v", err)
	}
	return &GeminiService{client: client}
}

func (s *GeminiService) Analyze(ctx context.Context, round *model.Round, holes []model.Hole, courseHoles []model.CourseHole) (string, error) {
	prompt := buildPrompt(round, holes, courseHoles)

	model := s.client.GenerativeModel("gemini-3.5-flash")
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		log.Printf("Gemini API error: %v", err)
		return "", fmt.Errorf("Gemini API call failed: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Gemini returned an empty response")
	}

	// Parts is a slice of genai.Part — for a text-only response the first part is genai.Text.
	text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		return "", fmt.Errorf("unexpected Gemini response part type")
	}

	return string(text), nil
}

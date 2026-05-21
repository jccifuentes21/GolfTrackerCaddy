package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/ai"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/store"
)

// RoundService contains round-level business operations.
// It is intentionally thin right now, but this is where validation and auth ownership checks should go.
type RoundService struct {
	rounds      *store.RoundStore
	holes       *store.HoleStore
	courseHoles *store.CourseHoleStore
	ai          *ai.Service
}

// NewRoundService wires the three dependencies. aiService is named to avoid
// shadowing the ai package name in the function body.
func NewRoundService(rounds *store.RoundStore, holes *store.HoleStore, courseHoles *store.CourseHoleStore, aiService *ai.Service) *RoundService {
	return &RoundService{
		rounds:      rounds,
		holes:       holes,
		courseHoles: courseHoles,
		ai:          aiService,
	}
}

func (s *RoundService) CreateRound(ctx context.Context, teeID, userID, courseName string, date time.Time, inputMode string) (*model.Round, error) {
	// The service creates the ID so the handler does not control database identity.
	// Passing a pointer lets the store receive the same Round value without copying it.
	r := &model.Round{
		ID:         uuid.New().String(),
		TeeID:      teeID,
		UserID:     userID,
		CourseName: courseName,
		Date:      date,
		InputMode: inputMode,
	}
	if err := s.rounds.Create(ctx, r); err != nil {
		return nil, fmt.Errorf("failed to create round: %w", err)
	}

	return r, nil
}

func (s *RoundService) GetRound(ctx context.Context, id string) (*model.Round, error) {
	return s.rounds.GetByID(ctx, id)
}

func (s *RoundService) ListRounds(ctx context.Context) ([]model.Round, error) {
	return s.rounds.List(ctx)
}

// Analyze fetches the round and its holes then delegates to the AI service.
// Keeping this in RoundService means the handler only needs a round ID — it never
// touches the hole store or the AI service directly.
func (s *RoundService) Analyze(ctx context.Context, roundID string) (string, error) {
	round, err := s.rounds.GetByID(ctx, roundID)
	if err != nil {
		return "", fmt.Errorf("round not found: %w", err)
	}

	holes, err := s.holes.ListByRound(ctx, roundID)
	if err != nil {
		return "", fmt.Errorf("could not fetch holes: %w", err)
	}

	courseHoles, err := s.courseHoles.ListByTee(ctx, round.TeeID)
	if err != nil {
		return "", fmt.Errorf("could not fetch course holes: %w", err)
	}

	// The ai service owns the prompt and the Claude call — this layer just passes data through.
	return s.ai.Analyze(ctx, round, holes, courseHoles)
}

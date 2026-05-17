package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/store"
)

// RoundService contains round-level business operations.
// It is intentionally thin right now, but this is where validation and auth ownership checks should go.
type RoundService struct {
	rounds *store.RoundStore
}

func NewRoundService(rounds *store.RoundStore) *RoundService {
	return &RoundService{rounds: rounds}
}

func (s *RoundService) CreateRound(ctx context.Context, teeID, userID string, date time.Time, inputMode string) (*model.Round, error) {
	// The service creates the ID so the handler does not control database identity.
	// Passing a pointer lets the store receive the same Round value without copying it.
	r := &model.Round{
		ID:        uuid.New().String(),
		TeeID:     teeID,
		UserID:    userID,
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

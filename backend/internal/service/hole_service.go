package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/store"
)

// HoleService owns the workflow for saving and reading played hole stats.
// This is where score validation can live later, for example putts >= 0 or holeNumber 1-18.
type HoleService struct {
	holes *store.HoleStore
}

func NewHoleService(holes *store.HoleStore) *HoleService {
	return &HoleService{holes: holes}
}

func (s *HoleService) SaveHole(ctx context.Context, roundID string, holeNumber int, score int, fairwayHit bool, GIR bool, putts int, missDirection string) (*model.Hole, error) {
	// A new ID is generated on every save attempt, but the store's upsert means the existing row wins
	// when this round and hole number already exist.
	h := &model.Hole{
		ID:            uuid.New().String(),
		RoundID:       roundID,
		HoleNumber:    holeNumber,
		Score:         score,
		FairwayHit:    fairwayHit,
		GIR:           GIR,
		Putts:         putts,
		MissDirection: missDirection,
	}
	if err := s.holes.Create(ctx, h); err != nil {
		return nil, fmt.Errorf("failed to save hole for round %s, hole %d: %w", roundID, holeNumber, err)
	}
	return h, nil
}

func (s *HoleService) ListHoles(ctx context.Context, roundID string) ([]model.Hole, error) {
	return s.holes.ListByRound(ctx, roundID)
}

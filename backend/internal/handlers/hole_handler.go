package handler

import (
	"encoding/json"
	"net/http"

	"github.com/jccifuentes21/GolfTrackerCaddy/internal/service"
)

// HoleHandler owns HTTP endpoints for scores entered within a round.
// It converts route and JSON input into service method arguments.
type HoleHandler struct {
	holes *service.HoleService
}

func NewHoleHandler(holes *service.HoleService) *HoleHandler {
	return &HoleHandler{holes: holes}
}

func (h *HoleHandler) Create(w http.ResponseWriter, r *http.Request) {
	// The round id comes from the URL because holes are nested under their parent round.
	roundID := r.PathValue("round_id")

	// This DTO is scoped to the handler because it represents incoming JSON, not stored state.
	var input struct {
		HoleNumber    int    `json:"hole_number"`
		Score         int    `json:"score"`
		FairwayHit    bool   `json:"fairway_hit"`
		GIR           bool   `json:"gir"`
		Putts         int    `json:"putts"`
		MissDirection string `json:"miss_direction"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	hole, err := h.holes.SaveHole(r.Context(), roundID, input.HoleNumber, input.Score, input.FairwayHit, input.GIR, input.Putts, input.MissDirection)
	if err != nil {
		http.Error(w, "Failed to save hole", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(hole)
}

func (h *HoleHandler) List(w http.ResponseWriter, r *http.Request) {
	// GET /rounds/{round_id}/holes returns the played holes for one round.
	roundID := r.PathValue("round_id")
	holes, err := h.holes.ListHoles(r.Context(), roundID)
	if err != nil {
		http.Error(w, "Failed to list holes", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(holes)
}

package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jccifuentes21/GolfTrackerCaddy/internal/service"
)

// RoundHandler owns the HTTP layer for round resources.
// It does not write SQL directly; it delegates business work to RoundService.
type RoundHandler struct {
	rounds *service.RoundService
}

func NewRoundHandler(rounds *service.RoundService) *RoundHandler {
	return &RoundHandler{rounds: rounds}
}

func (h *RoundHandler) Create(w http.ResponseWriter, r *http.Request) {
	// This request DTO is local to the handler because it is an HTTP input shape,
	// not a domain model. The service builds the actual model.Round.
	var input struct {
		TeeID     string `json:"tee_id"`
		UserID    string `json:"user_id"`
		Date      string `json:"date"`
		InputMode string `json:"input_mode"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Go's reference date is 2006-01-02. This accepts a date-only value from the frontend
	// and avoids timezone confusion for a round date.
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		http.Error(w, "Invalid date format", http.StatusBadRequest)
		return
	}

	round, err := h.rounds.CreateRound(r.Context(), input.TeeID, input.UserID, date, input.InputMode)
	if err != nil {
		http.Error(w, "Failed to create round", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(round)
}

func (h *RoundHandler) Get(w http.ResponseWriter, r *http.Request) {
	// Route parameters keep resource identity in the URL: GET /rounds/{id}.
	id := r.PathValue("id")
	round, err := h.rounds.GetRound(r.Context(), id)
	if err != nil {
		http.Error(w, "Failed to get round", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(round)
}

func (h *RoundHandler) List(w http.ResponseWriter, r *http.Request) {
	// Listing rounds is a read-only collection endpoint.
	rounds, err := h.rounds.ListRounds(r.Context())
	if err != nil {
		http.Error(w, "Failed to list rounds", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rounds)
}

package handler

import (
	"encoding/json"
	"net/http"

	"github.com/jccifuentes21/GolfTrackerCaddy/internal/api"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/service"
)

// CourseHandler translates HTTP requests into course service calls.
// Handlers should stay thin: parse input, call a service, write an HTTP response.
type CourseHandler struct {
	courses *service.CourseService
}

func NewCourseHandler(courses *service.CourseService) *CourseHandler {
	return &CourseHandler{courses: courses}
}

func (h *CourseHandler) Search(w http.ResponseWriter, r *http.Request) {
	// Query parameters are appropriate here because search is a read operation with simple filters.
	query := r.URL.Query().Get("query")
	if query == "" {
		http.Error(w, "Query is empty", http.StatusBadRequest)
		return
	}

	results, err := h.courses.SearchCourses(r.Context(), query)
	if err != nil {
		http.Error(w, "Failed to search courses", http.StatusInternalServerError)
		return
	}
	// Always set Content-Type before encoding JSON so clients know how to parse the response.
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// saveCourseResponse groups the saved parent course with the child tees the frontend needs next.
type saveCourseResponse struct {
	Course *model.Course `json:"course"`
	Tees   []model.Tee   `json:"tees"`
}

func (h *CourseHandler) Save(w http.ResponseWriter, r *http.Request) {
	var input api.APICourse
	// Decode maps request JSON into a Go struct using json tags.
	// Bad JSON is a client error, so this returns 400 instead of 500.
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	course, tees, err := h.courses.SaveCourse(r.Context(), &input)
	if err != nil {
		http.Error(w, "Failed to save course", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// 201 Created tells the client the request produced persisted server-side resources.
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(saveCourseResponse{Course: course, Tees: tees})
}

func (h *CourseHandler) ListTees(w http.ResponseWriter, r *http.Request) {
	// PathValue reads the {id} segment from the route registered in main.go.
	courseID := r.PathValue("id")
	if courseID == "" {
		http.Error(w, "Missing course ID", http.StatusBadRequest)
		return
	}

	tees, err := h.courses.ListTeesByCourse(r.Context(), courseID)
	if err != nil {
		http.Error(w, "Failed to fetch tees", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tees)
}

func (h *CourseHandler) ListTeeHoles(w http.ResponseWriter, r *http.Request) {
	// This endpoint returns the scorecard layout for a selected tee before the user enters scores.
	teeID := r.PathValue("id")
	if teeID == "" {
		http.Error(w, "Missing tee ID", http.StatusBadRequest)
		return
	}

	holes, err := h.courses.ListHolesByTee(r.Context(), teeID)
	if err != nil {
		http.Error(w, "Failed to fetch holes", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(holes)
}

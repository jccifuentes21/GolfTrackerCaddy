package handler

import (
	"encoding/json"
	"net/http"

	"github.com/jccifuentes21/GolfTrackerCaddy/internal/api"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/service"
)

type CourseHandler struct {
	courses *service.CourseService
}

func NewCourseHandler(courses *service.CourseService) *CourseHandler {
	return &CourseHandler{courses: courses}
}

func (h *CourseHandler) Search(w http.ResponseWriter, r *http.Request) {
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
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func (h *CourseHandler) Save(w http.ResponseWriter, r *http.Request) {
	var input api.APICourse
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.courses.SaveCourse(r.Context(), &input); err != nil {
		http.Error(w, "Failed to save course", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

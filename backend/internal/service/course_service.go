package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/api"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/model"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/store"
)

type CourseService struct {
	courses     *store.CourseStore
	tees        *store.TeeStore
	courseHoles *store.CourseHoleStore
	apiClient   *api.GolfCourseClient
}

// In the case of this service - we want the constructor to include all three stores since we'll be talking to the API and writing to all three tables
func NewCourseService(courses *store.CourseStore, tees *store.TeeStore, courseHoles *store.CourseHoleStore, apiClient *api.GolfCourseClient) *CourseService {
	return &CourseService{
		courses:     courses,
		tees:        tees,
		courseHoles: courseHoles,
		apiClient:   apiClient,
	}
}

func (s *CourseService) SearchCourses(ctx context.Context, query string) (*api.SearchResponse, error) {
	//For search, the service just delegates to the client. Simple
	return s.apiClient.SearchCourses(ctx, query)
}

func (s *CourseService) SaveCourse(ctx context.Context, apiCourse *api.APICourse) error {
	course := model.Course{
		ID:         fmt.Sprintf("%d", apiCourse.ID),
		ClubName:   apiCourse.ClubName,
		CourseName: apiCourse.CourseName,
		Address:    apiCourse.Location.Address,
		City:       apiCourse.Location.City,
		State:      apiCourse.Location.State,
		Country:    apiCourse.Location.Country,
	}

	if err := s.courses.Create(ctx, &course); err != nil {
		return fmt.Errorf("failed to save course: %w", err)
	}

	//make a hash map of seen tees to avoid duplicates
	seen := make(map[string]bool)
	//store all tees from both genders in a single slice
	allTees := append(apiCourse.Tees.Male, apiCourse.Tees.Female...)

	//iterate over all tees, add them to the hash map and then create the tee on the db. If tee is repeated in both genders, it will be skipped.
	for _, apiTee := range allTees {
		if seen[apiTee.TeeName] {
			continue
		}
		seen[apiTee.TeeName] = true

		tee := model.Tee{
			ID:           uuid.New().String(),
			CourseID:     course.ID,
			TeeName:      apiTee.TeeName,
			CourseRating: apiTee.CourseRating,
			SlopeRating:  apiTee.SlopeRating,
			TotalYards:   apiTee.TotalYards,
			Par:          apiTee.ParTotal,
		}

		teeID, err := s.tees.Create(ctx, &tee)
		if err != nil {
			return fmt.Errorf("failed to save tee %s: %w", tee.TeeName, err)
		}

		//Once a tee is created successfully, create the holes for that tee
		var holes []model.CourseHole
		for i, apiHole := range apiTee.Holes {
			holes = append(holes, model.CourseHole{
				ID:         uuid.New().String(),
				TeeID:      teeID,
				HoleNumber: i + 1,
				Par:        apiHole.Par,
				Yardage:    apiHole.Yardage,
				Handicap:   apiHole.Handicap,
			})
		}
		//Create the holes in a single batch transaction
		if err := s.courseHoles.CreateBatch(ctx, holes); err != nil {
			return fmt.Errorf("failed to save course holes for tee %s: %w", tee.TeeName, err)
		}
	}
	return nil
}

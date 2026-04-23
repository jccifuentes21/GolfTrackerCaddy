package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

//these are the structs that will be used to parse the JSON response from the API into Go structs

// CourseSearchResponse is the top-level response from the API
type SearchResponse struct {
	Courses []APICourse `json:"courses"`
}

// APICourse is a single course from the API response
type APICourse struct {
	ID         int         `json:"id"`
	ClubName   string      `json:"club_name"`
	CourseName string      `json:"course_name"`
	Location   APILocation `json:"location"`
	Tees       APITees     `json:"tees"`
}

type APILocation struct {
	Address string `json:"address"`
	City    string `json:"city"`
	State   string `json:"state"`
	Country string `json:"country"`
}

type APITees struct {
	Male   []APITee `json:"male"`
	Female []APITee `json:"female"`
}

type APITee struct {
	TeeName      string    `json:"tee_name"`
	CourseRating float64   `json:"course_rating"`
	SlopeRating  int       `json:"slope_rating"`
	TotalYards   int       `json:"total_yards"`
	ParTotal     int       `json:"par_total"`
	Holes        []APIHole `json:"holes"`
}

type APIHole struct {
	Par      int `json:"par"`
	Yardage  int `json:"yardage"`
	Handicap int `json:"handicap"`
}

//Struct and constructor for client

type GolfCourseClient struct {
	apiKey     string
	httpClient *http.Client
}

func NewGolfCourseClient(apiKey string) *GolfCourseClient {
	return &GolfCourseClient{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

// SearchCourses searches for courses by name or club name
func (c *GolfCourseClient) SearchCourses(ctx context.Context, query string) (*SearchResponse, error) {
	endpoint := "https://api.golfcourseapi.com/v1/search?search_query=" + url.QueryEscape(query)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Key %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status code %d", resp.StatusCode)
	}

	var result SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}
	return &result, nil
}

package golfDataApi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

// SearchResponse mirrors the top-level JSON returned by the Golf Course API.
// Keeping external API shapes in this package prevents them from leaking into the domain models.
type SearchResponse struct {
	Courses []APICourse `json:"courses"`
}

// APICourse is one raw course result from the external API.
// The service layer converts this shape into the app's Course, Tee, and CourseHole models.
type APICourse struct {
	ID         int         `json:"id"`
	ClubName   string      `json:"club_name"`
	CourseName string      `json:"course_name"`
	Location   APILocation `json:"location"`
	Tees       APITees     `json:"tees"`
}

// APILocation is nested because that is how the upstream API structures address data.
type APILocation struct {
	Address string `json:"address"`
	City    string `json:"city"`
	State   string `json:"state"`
	Country string `json:"country"`
}

// APITees preserves the API's male and female tee grouping.
// The app later deduplicates by tee name because the same tee can appear in both groups.
type APITees struct {
	Male   []APITee `json:"male"`
	Female []APITee `json:"female"`
}

// APITee is the upstream tee payload before it is saved as a database Tee.
type APITee struct {
	TeeName      string    `json:"tee_name"`
	CourseRating float64   `json:"course_rating"`
	SlopeRating  int       `json:"slope_rating"`
	TotalYards   int       `json:"total_yards"`
	ParTotal     int       `json:"par_total"`
	Holes        []APIHole `json:"holes"`
}

// APIHole is static course metadata, not a played hole score.
// Played hole data lives in model.Hole after a user starts a round.
type APIHole struct {
	Par      int `json:"par"`
	Yardage  int `json:"yardage"`
	Handicap int `json:"handicap"`
}

// GolfCourseClient wraps the external HTTP dependency.
// That keeps request construction and API authentication out of handlers and services.
type GolfCourseClient struct {
	apiKey     string
	httpClient *http.Client
}

// NewGolfCourseClient injects the API key once so callers do not pass secrets around per request.
func NewGolfCourseClient(apiKey string) *GolfCourseClient {
	return &GolfCourseClient{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

// SearchCourses searches the external Golf Course API by course or club name.
func (c *GolfCourseClient) SearchCourses(ctx context.Context, query string) (*SearchResponse, error) {
	// QueryEscape makes arbitrary search text safe to place inside a URL query string.
	endpoint := "https://api.golfcourseapi.com/v1/search?search_query=" + url.QueryEscape(query)

	// The request is tied to the caller's context, so cancellations and timeouts can flow down
	// from the HTTP request that started this work.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// This API expects the key in an Authorization header instead of a query parameter.
	// Headers are preferred for secrets because they avoid accidental logging in URLs.
	req.Header.Set("Authorization", fmt.Sprintf("Key %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle non-200 responses before decoding. Error bodies usually do not match SearchResponse.
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status code %d", resp.StatusCode)
	}

	var result SearchResponse
	// json.Decoder streams from the response body and maps JSON field names via struct tags.
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}
	return &result, nil
}

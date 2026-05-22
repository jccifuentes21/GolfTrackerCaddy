package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/jccifuentes21/GolfTrackerCaddy/internal/ai"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/db"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/golfDataApi"
	handler "github.com/jccifuentes21/GolfTrackerCaddy/internal/handlers"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/middleware"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/service"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/store"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Loading environment variables at startup keeps config outside the binary.
	// In interviews, this is the "12-factor app" idea: deploy the same code with different config.
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	authMiddleware, err := middleware.NewAuthMiddleware(os.Getenv("CLERK_JWKS_URL"))
	if err != nil {
		log.Fatalf("Failed to initialize auth middleware: %v", err)
	}

	// pgxpool manages a reusable pool of database connections.
	// The app shares this pool across stores instead of opening a new connection per request.
	pool, err := db.Connect(databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Migrations run before the HTTP server starts so request handlers never see a half-ready schema.
	if err = db.RunMigrations(pool); err != nil {
		log.Fatalf("Could not run migrations: %v", err)
	}
	log.Println("Database connected and migrations complete")

	apiKey := os.Getenv("GOLF_COURSE_API_KEY")
	if apiKey == "" {
		log.Fatal("GOLF_COURSE_API_KEY is not set")
	}

	// Stores own persistence. They get the database pool and are the only layer that writes SQL.
	courseStore := store.NewCourseStore(pool)
	teeStore := store.NewTeeStore(pool)
	courseHoleStore := store.NewCourseHoleStore(pool)
	roundStore := store.NewRoundStore(pool)
	holeStore := store.NewHoleStore(pool)

	// Services own business workflows. CourseService is intentionally wider because saving a course
	// also saves tees and static hole data from the external Golf Course API.
	courseService := service.NewCourseService(courseStore, teeStore, courseHoleStore, golfDataApi.NewGolfCourseClient(apiKey))
	roundService := service.NewRoundService(roundStore, holeStore, courseHoleStore, ai.NewService())
	holeService := service.NewHoleService(holeStore)

	// Handlers own HTTP concerns: request parsing, status codes, and JSON responses.
	courseHandler := handler.NewCourseHandler(courseService)
	roundHandler := handler.NewRoundHandler(roundService)
	holeHandler := handler.NewHoleHandler(holeService)

	mux := http.NewServeMux()

	// Go 1.22+ ServeMux supports method-aware route patterns like "GET /courses/search".
	// This avoids a third-party router while the API surface is still small.
	mux.HandleFunc("GET /api/courses/search", courseHandler.Search)
	mux.HandleFunc("GET /api/courses/{id}", courseHandler.GetCourse)
	mux.HandleFunc("POST /api/courses", courseHandler.Save)
	mux.HandleFunc("GET /api/courses/{id}/tees", courseHandler.ListTees)
	mux.HandleFunc("GET /api/tees/{id}", courseHandler.GetTee)
	mux.HandleFunc("GET /api/tees/{id}/holes", courseHandler.ListTeeHoles)

	mux.HandleFunc("POST /api/rounds", roundHandler.Create)
	mux.HandleFunc("GET /api/rounds", roundHandler.List)
	mux.HandleFunc("GET /api/rounds/{id}", roundHandler.Get)

	mux.HandleFunc("POST /api/rounds/{round_id}/holes", holeHandler.Create)
	mux.HandleFunc("GET /api/rounds/{round_id}/holes", holeHandler.List)

	// Manual trigger for post-round AI analysis. The service gathers holes and course context first.
	mux.HandleFunc("POST /api/rounds/{id}/analyze", roundHandler.Analyze)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Comma-separated origins, e.g. "http://localhost:5173,https://theloop.vercel.app"
	// Defaults to Vite's local dev origin so local frontend calls work without extra setup.
	originsEnv := os.Getenv("CORS_ALLOWED_ORIGINS")
	if originsEnv == "" {
		originsEnv = "http://localhost:5173"
	}
	allowedOrigins := strings.Split(originsEnv, ",")

	// CORS is enforced by browsers, not by the Go server itself.
	// The backend must explicitly allow the frontend origin before browsers will expose responses.
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           86400, // cache preflight for 24h
	})

	log.Printf("Starting server on port %s (CORS allowed: %v)", port, allowedOrigins)

	handler := corsHandler.Handler(authMiddleware.Wrap(mux))

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

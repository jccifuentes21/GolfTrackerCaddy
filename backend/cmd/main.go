package main

import (
	"log"
	"net/http"
	"os"

	"github.com/jccifuentes21/GolfTrackerCaddy/internal/api"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/db"
	handler "github.com/jccifuentes21/GolfTrackerCaddy/internal/handlers"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/service"
	"github.com/jccifuentes21/GolfTrackerCaddy/internal/store"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Fatalf("Could not load .env file: %v", err)
	}

	//Dabase operations
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}
	pool, err := db.Connect(databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err = db.RunMigrations(pool, "migrations"); err != nil {
		log.Fatalf("Could not run migrations: %v", err)
	}
	log.Println("Database connected and migrations complete")

	//Check golf course API
	apiKey := os.Getenv("GOLF_COURSE_API_KEY")
	if apiKey == "" {
		log.Fatal("GOLF_COURSE_API_KEY is not set")
	}

	//Wiring up all the stores
	courseStore := store.NewCourseStore(pool)
	teeStore := store.NewTeeStore(pool)
	courseHoleStore := store.NewCourseHoleStore(pool)
	roundStore := store.NewRoundStore(pool)
	holeStore := store.NewHoleStore(pool)

	//Adding all services
	courseService := service.NewCourseService(courseStore, teeStore, courseHoleStore, api.NewGolfCourseClient(apiKey))
	roundService := service.NewRoundService(roundStore)
	holeService := service.NewHoleService(holeStore)

	//Adding all handlers
	courseHandler := handler.NewCourseHandler(courseService)
	roundHandler := handler.NewRoundHandler(roundService)
	holeHandler := handler.NewHoleHandler(holeService)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /courses/search", courseHandler.Search)
	mux.HandleFunc("POST /courses", courseHandler.Save)

	mux.HandleFunc("POST /rounds", roundHandler.Create)
	mux.HandleFunc("GET /rounds", roundHandler.List)
	mux.HandleFunc("GET /rounds/{id}", roundHandler.Get)

	mux.HandleFunc("POST /rounds/{round_id}/holes", holeHandler.Create)
	mux.HandleFunc("GET /rounds/{round_id}/holes", holeHandler.List)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

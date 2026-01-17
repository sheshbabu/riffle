package main

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"riffle/commons/exif"
	"riffle/commons/sqlite"
	"riffle/commons/utils"
	"riffle/features/calendar"
	"riffle/features/geocoding"
	"riffle/features/ingest"
	"riffle/features/photos"
	"syscall"

	"github.com/joho/godotenv"
)

//go:embed assets/*
var assets embed.FS

//go:embed migrations/*.sql
var migrations embed.FS

func main() {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("killing server", "error", r)
			os.Exit(1)
		}
	}()

	loadEnv()

	sqlite.NewDB()
	defer sqlite.DB.Close()

	osSignalChan := make(chan os.Signal, 1)
	signal.Notify(osSignalChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-osSignalChan
		slog.Info("received shutdown signal, closing database connection...")
		if err := sqlite.DB.Close(); err != nil {
			slog.Error("error closing database", "error", err)
		}
		slog.Info("database connection closed. Exiting.")
		os.Exit(0)
	}()

	sqlite.Migrate(migrations)

	if err := geocoding.Init(); err != nil {
		slog.Error("error initializing geocoding", "error", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	port = ":" + port

	defer exif.Close()

	slog.Info("starting server", "port", port)
	err := http.ListenAndServe(port, newRouter())
	if err != nil {
		panic(err)
	}
}

func loadEnv() {
	if err := godotenv.Load(); err != nil {
		slog.Warn("no .env file found, using env vars only")
	}

	for _, pathVar := range []string{"IMPORT_PATH", "LIBRARY_PATH", "EXPORT_PATH", "THUMBNAILS_PATH"} {
		pathVal := os.Getenv(pathVar)
		if pathVal == "" {
			slog.Error("missing env var", "name", pathVar)
			os.Exit(1)
		}
		if err := utils.CheckDirectories(pathVal); err != nil {
			slog.Error("directory check failed", "name", pathVal, "error", err)
			os.Exit(1)
		}
	}
}

func newRouter() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/import/scan/", ingest.HandleScanImportFolder)
	mux.HandleFunc("GET /api/import/scan/results/", ingest.HandleGetScanResults)
	mux.HandleFunc("GET /api/import/progress/", ingest.HandleImportProgress)
	mux.HandleFunc("POST /api/import/move/", ingest.HandleImport)
	mux.HandleFunc("GET /api/photos/", photos.HandleGetPhotos)
	mux.HandleFunc("GET /api/photos/uncurated/", photos.HandleGetUncuratedPhotos)
	mux.HandleFunc("GET /api/photos/trashed/", photos.HandleGetTrashedPhotos)
	mux.HandleFunc("GET /api/photos/filters/", photos.HandleGetFilterOptions)
	mux.HandleFunc("POST /api/photos/curate/", photos.HandleCuratePhoto)
	mux.HandleFunc("GET /api/photo/", photos.HandleServePhoto)
	mux.HandleFunc("GET /api/thumbnail/", photos.HandleServeThumbnail)
	mux.HandleFunc("GET /api/calendar/months/", calendar.HandleGetCalendarMonths)
	mux.HandleFunc("GET /assets/", handleStaticAssets)
	mux.HandleFunc("GET /", handleRoot)

	return mux
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	var indexPage []byte
	var err error

	if os.Getenv("DEV_MODE") == "true" {
		indexPage, err = os.ReadFile("./assets/index.html")
	} else {
		indexPage, err = assets.ReadFile("assets/index.html")
	}

	if err != nil {
		slog.Error("error reading index.html", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "READ_ERROR", "Failed to load page")
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(indexPage)
}

func handleStaticAssets(w http.ResponseWriter, r *http.Request) {
	var fsys http.FileSystem

	if os.Getenv("DEV_MODE") == "true" {
		fsys = http.Dir("./assets")
	} else {
		subtree, err := fs.Sub(assets, "assets")
		if err != nil {
			slog.Error("error reading assets subtree", "error", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "READ_ERROR", "Failed to load assets")
			return
		}
		fsys = http.FS(subtree)
	}

	http.StripPrefix("/assets/", http.FileServer(fsys)).ServeHTTP(w, r)
}

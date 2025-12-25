package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"riffle/commons/exif"
	"riffle/commons/sqlite"
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

	importPath := os.Getenv("IMPORT_PATH")
	libraryPath := os.Getenv("LIBRARY_PATH")
	exportPath := os.Getenv("EXPORT_PATH")

	if importPath == "" || libraryPath == "" || exportPath == "" {
		slog.Error("missing env vars: IMPORT_PATH, LIBRARY_PATH, and EXPORT_PATH")
		os.Exit(1)
	}
}

func newRouter() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/import/scan/", ingest.HandleScanImportFolder)
	mux.HandleFunc("GET /api/import/scan/results", ingest.HandleGetScanResults)
	mux.HandleFunc("GET /api/import/scan/progress/", ingest.HandleScanProgress)
	mux.HandleFunc("POST /api/import/move/", ingest.HandleImport)
	mux.HandleFunc("GET /api/photos/", photos.HandleGetPhotos)
	mux.HandleFunc("GET /api/photos/uncurated/", photos.HandleGetUncuratedPhotos)
	mux.HandleFunc("GET /api/photos/trashed/", photos.HandleGetTrashedPhotos)
	mux.HandleFunc("POST /api/photos/curate/", photos.HandleCuratePhoto)
	mux.HandleFunc("GET /api/photo/", photos.HandleServePhoto)
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
		err = fmt.Errorf("error reading index.html: %w", err)
		slog.Error(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
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
			err = fmt.Errorf("error reading assets subtree: %w", err)
			slog.Error(err.Error())
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		fsys = http.FS(subtree)
	}

	http.StripPrefix("/assets/", http.FileServer(fsys)).ServeHTTP(w, r)
}

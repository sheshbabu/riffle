package main

import (
	"embed"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"riffle/commons/exif"
	"riffle/features/dedupe"
	"strings"
)

//go:embed assets/*
var assets embed.FS

func main() {
	port := flag.String("port", "8080", "Server port")
	flag.Parse()

	defer exif.Close()

	runServer(*port)
}

func checkDirectories(paths ...string) error {
	for _, path := range paths {
		info, err := os.Stat(path)
		if err != nil {
			if os.IsNotExist(err) {
				return fmt.Errorf("directory does not exist: %s", path)
			}
			return err
		}
		if !info.IsDir() {
			return fmt.Errorf("path is not a directory: %s", path)
		}
	}
	return nil
}

func runServer(port string) {
	portStr := ":" + port
	slog.Info("starting riffle server", "port", portStr)
	err := http.ListenAndServe(portStr, newRouter())
	if err != nil {
		panic(err)
	}
}

func newRouter() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/dedupe/", handleDedupe)
	mux.HandleFunc("GET /api/dedupe/results/", handleDedupeResults)
	mux.HandleFunc("GET /api/photo/", handlePhotoServe)
	mux.HandleFunc("GET /assets/", handleStaticAssets)
	mux.HandleFunc("GET /", handleRoot)

	return mux
}

type DedupeRequest struct {
	InboxPath   string `json:"inboxPath"`
	LibraryPath string `json:"libraryPath"`
	TrashPath   string `json:"trashPath"`
	IsDryRun    bool   `json:"isDryRun"`
}

type DedupeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

const resultsFilePath = "/tmp/riffle-dedupe-results.json"

func handleDedupe(w http.ResponseWriter, r *http.Request) {
	var req DedupeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("failed to decode request", "error", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.InboxPath == "" || req.LibraryPath == "" || req.TrashPath == "" {
		http.Error(w, "all folder paths are required", http.StatusBadRequest)
		return
	}

	if err := checkDirectories(req.InboxPath, req.LibraryPath, req.TrashPath); err != nil {
		slog.Error("directory check failed", "error", err)
		http.Error(w, fmt.Sprintf("directory check failed: %v", err), http.StatusBadRequest)
		return
	}

	// Remove old results file
	os.Remove(resultsFilePath)

	go func() {
		stats, err := dedupe.ProcessInbox(req.InboxPath, req.LibraryPath, req.TrashPath, req.IsDryRun)
		if err != nil {
			slog.Error("deduplication failed", "error", err)
			return
		}

		// Write results to file
		data, err := json.MarshalIndent(stats, "", "  ")
		if err != nil {
			slog.Error("failed to marshal stats", "error", err)
			return
		}

		if err := os.WriteFile(resultsFilePath, data, 0644); err != nil {
			slog.Error("failed to write results file", "error", err)
			return
		}

		slog.Info("results written to file", "path", resultsFilePath)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(DedupeResponse{
		Success: true,
		Message: "deduplication started",
	})
}

func handleDedupeResults(w http.ResponseWriter, r *http.Request) {
	data, err := os.ReadFile(resultsFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "no results available", http.StatusNotFound)
			return
		}
		slog.Error("failed to read results file", "error", err)
		http.Error(w, "failed to read results", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func handlePhotoServe(w http.ResponseWriter, r *http.Request) {
	encodedPath := r.URL.Query().Get("path")
	if encodedPath == "" {
		http.Error(w, "path parameter required", http.StatusBadRequest)
		return
	}

	decodedPath, err := base64.URLEncoding.DecodeString(encodedPath)
	if err != nil {
		http.Error(w, "invalid path encoding", http.StatusBadRequest)
		return
	}

	filePath := string(decodedPath)

	// Security check: ensure file exists and is readable
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "file not found", http.StatusNotFound)
			return
		}
		http.Error(w, "cannot access file", http.StatusForbidden)
		return
	}

	if fileInfo.IsDir() {
		http.Error(w, "path is a directory", http.StatusBadRequest)
		return
	}

	// Open file
	file, err := os.Open(filePath)
	if err != nil {
		slog.Error("failed to open file", "path", filePath, "error", err)
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Determine content type based on extension
	ext := strings.ToLower(filepath.Ext(filePath))
	contentType := getContentType(ext)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")

	// Stream file to response
	_, err = io.Copy(w, file)
	if err != nil {
		slog.Error("failed to stream file", "path", filePath, "error", err)
	}
}

func getContentType(ext string) string {
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".heic":
		return "image/heic"
	case ".heif":
		return "image/heif"
	case ".webp":
		return "image/webp"
	case ".bmp":
		return "image/bmp"
	case ".tiff", ".tif":
		return "image/tiff"
	case ".mp4":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".avi":
		return "video/x-msvideo"
	case ".mkv":
		return "video/x-matroska"
	case ".wmv":
		return "video/x-ms-wmv"
	case ".flv":
		return "video/x-flv"
	case ".webm":
		return "video/webm"
	case ".m4v":
		return "video/x-m4v"
	case ".mpg", ".mpeg":
		return "video/mpeg"
	default:
		return "application/octet-stream"
	}
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

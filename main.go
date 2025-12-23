package main

import (
	"embed"
	"encoding/base64"
	"fmt"
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

func newRouter() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/dedupe/", dedupe.HandleDedupe)
	mux.HandleFunc("GET /api/dedupe/analyze/", dedupe.HandleDedupeAnalysis)
	mux.HandleFunc("POST /api/dedupe/execute/", dedupe.HandleExecute)
	mux.HandleFunc("GET /api/photo/", handlePhotoServe)
	mux.HandleFunc("GET /assets/", handleStaticAssets)
	mux.HandleFunc("GET /", handleRoot)

	return mux
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

	// Serve file using http.ServeContent for range request support
	http.ServeContent(w, r, filepath.Base(filePath), fileInfo.ModTime(), file)
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

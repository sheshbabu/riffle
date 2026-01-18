package photos

import (
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"riffle/commons/utils"
	"strings"
)

type ThumbnailRebuildResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func HandleServeThumbnail(w http.ResponseWriter, r *http.Request) {
	encodedPath := r.URL.Query().Get("path")
	if encodedPath == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_PATH", "Path parameter required")
		return
	}

	decodedPath, err := base64.URLEncoding.DecodeString(encodedPath)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_PATH", "Invalid path encoding")
		return
	}

	filePath := string(decodedPath)
	libraryPath := os.Getenv("LIBRARY_PATH")
	thumbnailsPath := os.Getenv("THUMBNAILS_PATH")

	if !strings.HasPrefix(filePath, libraryPath) {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_PATH", "File not in library")
		return
	}

	thumbnailPath := strings.Replace(filePath, libraryPath, thumbnailsPath, 1)
	ext := filepath.Ext(thumbnailPath)
	thumbnailPath = strings.TrimSuffix(thumbnailPath, ext) + ".jpg"

	thumbnailInfo, err := os.Stat(thumbnailPath)
	if err != nil {
		if os.IsNotExist(err) {
			utils.SendErrorResponse(w, http.StatusNotFound, "NOT_FOUND", "Thumbnail not found")
			return
		}
		utils.SendErrorResponse(w, http.StatusInternalServerError, "STAT_ERROR", "Failed to access thumbnail")
		return
	}

	thumbnailFile, err := os.Open(thumbnailPath)
	if err != nil {
		slog.Error("failed to open thumbnail", "path", thumbnailPath, "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "READ_ERROR", "Failed to read thumbnail")
		return
	}
	defer thumbnailFile.Close()

	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	http.ServeContent(w, r, filepath.Base(thumbnailPath), thumbnailInfo.ModTime(), thumbnailFile)
}

func HandleRebuildThumbnails(w http.ResponseWriter, r *http.Request) {
	libraryPath := os.Getenv("LIBRARY_PATH")
	thumbnailsPath := os.Getenv("THUMBNAILS_PATH")

	currentProgress := GetThumbnailProgress()
	if currentProgress.Status == StatusThumbnailRebuildProcessing {
		utils.SendErrorResponse(w, http.StatusConflict, "REBUILD_IN_PROGRESS", "Thumbnail rebuild already in progress")
		return
	}

	go func() {
		if err := RebuildThumbnails(libraryPath, thumbnailsPath); err != nil {
			slog.Error("failed to rebuild thumbnails", "error", err)
			return
		}
		slog.Info("thumbnail rebuild completed")
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(ThumbnailRebuildResponse{
		Success: true,
		Message: "thumbnail rebuild started",
	})
}

func HandleGetThumbnailProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetThumbnailProgress()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(progress)
}

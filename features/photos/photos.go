package photos

import (
	"encoding/base64"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"riffle/commons/media"
	"strings"
)

func HandleServePhoto(w http.ResponseWriter, r *http.Request) {
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

	file, err := os.Open(filePath)
	if err != nil {
		slog.Error("failed to open file", "path", filePath, "error", err)
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(filePath))
	contentType := media.GetContentType(ext)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")

	http.ServeContent(w, r, filepath.Base(filePath), fileInfo.ModTime(), file)
}

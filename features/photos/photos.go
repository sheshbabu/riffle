package photos

import (
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"riffle/commons/media"
	"strconv"
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

	widthStr := r.URL.Query().Get("width")
	heightStr := r.URL.Query().Get("height")

	ext := strings.ToLower(filepath.Ext(filePath))
	contentType := media.GetContentType(ext)

	shouldResize := (widthStr != "" || heightStr != "") && (media.IsImageFile(filePath) || media.IsVideoFile(filePath))

	if shouldResize {
		width, _ := strconv.Atoi(widthStr)
		height, _ := strconv.Atoi(heightStr)

		if width <= 0 {
			width = 4000
		}
		if height <= 0 {
			height = 4000
		}

		if media.IsVideoFile(filePath) {
			thumbnailData, thumbnailContentType, err := media.GenerateVideoThumbnail(filePath, width, height)
			if err != nil {
				slog.Error("failed to generate video thumbnail, serving placeholder", "path", filePath, "error", err)
				http.Error(w, "failed to generate video thumbnail", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", thumbnailContentType)
			w.Header().Set("Cache-Control", "public, max-age=3600")
			w.Write(thumbnailData)
			return
		}

		fileData, err := os.ReadFile(filePath)
		if err != nil {
			slog.Error("failed to read file for resizing", "path", filePath, "error", err)
			http.Error(w, "failed to read file", http.StatusInternalServerError)
			return
		}

		resizedData, resizedContentType, err := media.ResizeImage(fileData, filePath, width, height)
		if err != nil {
			slog.Error("failed to resize image, serving original", "path", filePath, "error", err)
			w.Header().Set("Content-Type", contentType)
			w.Header().Set("Cache-Control", "public, max-age=3600")
			w.Write(fileData)
			return
		}

		w.Header().Set("Content-Type", resizedContentType)
		w.Header().Set("Cache-Control", "public, max-age=3600")
		w.Write(resizedData)
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		slog.Error("failed to open file", "path", filePath, "error", err)
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")

	http.ServeContent(w, r, filepath.Base(filePath), fileInfo.ModTime(), file)
}

type PhotosResponse struct {
	Photos           []Photo `json:"photos"`
	PageStartRecord  int     `json:"pageStartRecord"`
	PageEndRecord    int     `json:"pageEndRecord"`
	TotalRecords     int     `json:"totalRecords"`
	CurrentOffset    int     `json:"currentOffset"`
	Limit            int     `json:"limit"`
}

func HandleGetPhotos(w http.ResponseWriter, r *http.Request) {
	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	limit := 100

	photos, err := GetPhotos(limit, offset)
	if err != nil {
		slog.Error("failed to get photos", "error", err)
		http.Error(w, "failed to fetch photos", http.StatusInternalServerError)
		return
	}

	response := PhotosResponse{
		Photos:        photos,
		CurrentOffset: offset,
		Limit:         limit,
	}

	if len(photos) > 0 {
		response.TotalRecords = photos[0].TotalRecords
		response.PageStartRecord = offset + 1
		response.PageEndRecord = offset + len(photos)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func HandleGetUncuratedPhotos(w http.ResponseWriter, r *http.Request) {
	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	limit := 100

	photos, err := GetUncuratedPhotos(limit, offset)
	if err != nil {
		slog.Error("failed to get uncurated photos", "error", err)
		http.Error(w, "failed to fetch uncurated photos", http.StatusInternalServerError)
		return
	}

	response := PhotosResponse{
		Photos:        photos,
		CurrentOffset: offset,
		Limit:         limit,
	}

	if len(photos) > 0 {
		response.TotalRecords = photos[0].TotalRecords
		response.PageStartRecord = offset + 1
		response.PageEndRecord = offset + len(photos)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func HandleGetTrashedPhotos(w http.ResponseWriter, r *http.Request) {
	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	limit := 100

	photos, err := GetTrashedPhotos(limit, offset)
	if err != nil {
		slog.Error("failed to get trashed photos", "error", err)
		http.Error(w, "failed to fetch trashed photos", http.StatusInternalServerError)
		return
	}

	response := PhotosResponse{
		Photos:        photos,
		CurrentOffset: offset,
		Limit:         limit,
	}

	if len(photos) > 0 {
		response.TotalRecords = photos[0].TotalRecords
		response.PageStartRecord = offset + 1
		response.PageEndRecord = offset + len(photos)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

type CurateRequest struct {
	FilePath   string `json:"filePath"`
	IsCurated  bool   `json:"isCurated"`
	IsTrashed  bool   `json:"isTrashed"`
	Rating     int    `json:"rating"`
}

func HandleCuratePhoto(w http.ResponseWriter, r *http.Request) {
	var req CurateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.FilePath == "" {
		http.Error(w, "filePath is required", http.StatusBadRequest)
		return
	}

	if req.Rating < 0 || req.Rating > 5 {
		http.Error(w, "rating must be between 0 and 5", http.StatusBadRequest)
		return
	}

	err := UpdatePhotoCuration(req.FilePath, req.IsCurated, req.IsTrashed, req.Rating)
	if err != nil {
		slog.Error("failed to curate photo", "error", err)
		http.Error(w, "failed to curate photo", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

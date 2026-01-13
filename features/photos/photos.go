package photos

import (
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"riffle/commons/media"
	"riffle/commons/utils"
	"strconv"
	"strings"
)

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

func HandleServePhoto(w http.ResponseWriter, r *http.Request) {
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

	fileInfo, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			utils.SendErrorResponse(w, http.StatusNotFound, "NOT_FOUND", "File not found")
			return
		}
		utils.SendErrorResponse(w, http.StatusForbidden, "ACCESS_DENIED", "Cannot access file")
		return
	}

	if fileInfo.IsDir() {
		utils.SendErrorResponse(w, http.StatusBadRequest, "IS_DIRECTORY", "Path is a directory")
		return
	}

	ext := strings.ToLower(filepath.Ext(filePath))
	contentType := media.GetContentType(ext)

	file, err := os.Open(filePath)
	if err != nil {
		slog.Error("failed to open file", "path", filePath, "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "READ_ERROR", "Failed to read file")
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")

	http.ServeContent(w, r, filepath.Base(filePath), fileInfo.ModTime(), file)
}

type PhotosResponse struct {
	Photos          []Photo `json:"photos"`
	Groups          []Group `json:"groups,omitempty"`
	Bursts          []Burst `json:"bursts,omitempty"`
	PageStartRecord int     `json:"pageStartRecord"`
	PageEndRecord   int     `json:"pageEndRecord"`
	TotalRecords    int     `json:"totalRecords"`
	CurrentOffset   int     `json:"currentOffset"`
	Limit           int     `json:"limit"`
}

func parseFiltersFromQuery(r *http.Request) *PhotoFilters {
	query := r.URL.Query()

	filters := &PhotoFilters{}
	hasFilters := false

	if ratings := query["ratings"]; len(ratings) > 0 {
		for _, rs := range ratings {
			if r, err := strconv.Atoi(rs); err == nil {
				filters.Ratings = append(filters.Ratings, r)
				hasFilters = true
			}
		}
	}

	if mediaType := query.Get("mediaType"); mediaType != "" && mediaType != "all" {
		filters.MediaType = mediaType
		hasFilters = true
	}

	if orientation := query.Get("orientation"); orientation != "" && orientation != "all" {
		filters.Orientation = orientation
		hasFilters = true
	}

	if years := query["years"]; len(years) > 0 {
		for _, ys := range years {
			if y, err := strconv.Atoi(ys); err == nil {
				filters.Years = append(filters.Years, y)
				hasFilters = true
			}
		}
	}

	if cameraMakes := query["cameraMakes"]; len(cameraMakes) > 0 {
		filters.CameraMakes = cameraMakes
		hasFilters = true
	}

	if cameraModels := query["cameraModels"]; len(cameraModels) > 0 {
		filters.CameraModels = cameraModels
		hasFilters = true
	}

	if countries := query["countries"]; len(countries) > 0 {
		filters.Countries = countries
		hasFilters = true
	}

	if states := query["states"]; len(states) > 0 {
		filters.States = states
		hasFilters = true
	}

	if cities := query["cities"]; len(cities) > 0 {
		filters.Cities = cities
		hasFilters = true
	}

	if fileFormats := query["fileFormats"]; len(fileFormats) > 0 {
		filters.FileFormats = fileFormats
		hasFilters = true
	}

	if !hasFilters {
		return nil
	}

	return filters
}

func HandleGetPhotos(w http.ResponseWriter, r *http.Request) {
	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	withGroups := r.URL.Query().Get("groups") == "true" || r.URL.Query().Get("sessions") == "true"
	filters := parseFiltersFromQuery(r)
	limit := 100

	if withGroups {
		photos, groups, err := GetPhotosWithGroups(limit, offset, true, false, filters)
		if err != nil {
			slog.Error("failed to get photos with groups", "error", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch photos")
			return
		}

		bursts := DetectBursts(photos)

		response := PhotosResponse{
			Photos:        photos,
			Groups:        groups,
			Bursts:        bursts,
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
		return
	}

	photos, err := GetPhotos(limit, offset)
	if err != nil {
		slog.Error("failed to get photos", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch photos")
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

	withGroups := r.URL.Query().Get("groups") == "true" || r.URL.Query().Get("sessions") == "true"
	filters := parseFiltersFromQuery(r)
	limit := 100

	if withGroups {
		photos, groups, err := GetPhotosWithGroups(limit, offset, false, false, filters)
		if err != nil {
			slog.Error("failed to get uncurated photos with groups", "error", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch photos")
			return
		}

		bursts := DetectBursts(photos)

		response := PhotosResponse{
			Photos:        photos,
			Groups:        groups,
			Bursts:        bursts,
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
		return
	}

	photos, err := GetUncuratedPhotos(limit, offset)
	if err != nil {
		slog.Error("failed to get uncurated photos", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch photos")
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

	withGroups := r.URL.Query().Get("groups") == "true" || r.URL.Query().Get("sessions") == "true"
	filters := parseFiltersFromQuery(r)
	limit := 100

	if withGroups {
		photos, groups, err := GetPhotosWithGroups(limit, offset, false, true, filters)
		if err != nil {
			slog.Error("failed to get trashed photos with groups", "error", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch photos")
			return
		}

		bursts := DetectBursts(photos)

		response := PhotosResponse{
			Photos:        photos,
			Groups:        groups,
			Bursts:        bursts,
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
		return
	}

	photos, err := GetTrashedPhotos(limit, offset)
	if err != nil {
		slog.Error("failed to get trashed photos", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch photos")
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

func HandleGetFilterOptions(w http.ResponseWriter, r *http.Request) {
	options, err := GetFilterOptions()
	if err != nil {
		slog.Error("failed to get filter options", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch filter options")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(options)
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
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_BODY", "Invalid request body")
		return
	}

	if req.FilePath == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_PATH", "File path is required")
		return
	}

	if req.Rating < 0 || req.Rating > 5 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_RATING", "Rating must be between 0 and 5")
		return
	}

	err := UpdatePhotoCuration(req.FilePath, req.IsCurated, req.IsTrashed, req.Rating)
	if err != nil {
		slog.Error("failed to curate photo", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "CURATE_ERROR", "Failed to update photo")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

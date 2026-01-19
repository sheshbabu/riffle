package albums

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"riffle/commons/utils"
	"strconv"
)

type CreateAlbumRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type AddPhotosRequest struct {
	AlbumIDs  []int    `json:"albumIds"`
	FilePaths []string `json:"filePaths"`
}

func HandleGetAlbums(w http.ResponseWriter, r *http.Request) {
	albums, err := GetAllAlbums()
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_ALBUMS_ERROR", "Failed to get albums")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(albums)
}

func HandleGetAlbum(w http.ResponseWriter, r *http.Request) {
	albumIDStr := r.PathValue("id")
	albumID, err := strconv.Atoi(albumIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ALBUM_ID", "Invalid album ID")
		return
	}

	album, err := GetAlbumByID(albumID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusNotFound, "ALBUM_NOT_FOUND", "Album not found")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(album)
}

func HandleCreateAlbum(w http.ResponseWriter, r *http.Request) {
	var req CreateAlbumRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_NAME", "Album name is required")
		return
	}

	album, err := CreateAlbum(req.Name, req.Description)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "CREATE_ALBUM_ERROR", "Failed to create album")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(album)
}

func HandleAddPhotosToAlbums(w http.ResponseWriter, r *http.Request) {
	var req AddPhotosRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if len(req.AlbumIDs) == 0 || len(req.FilePaths) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_DATA", "Album IDs and file paths are required")
		return
	}

	for _, albumID := range req.AlbumIDs {
		if err := AddPhotosToAlbum(albumID, req.FilePaths); err != nil {
			slog.Error("failed to add photos to album", "albumId", albumID, "error", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "ADD_PHOTOS_ERROR", "Failed to add photos to album")
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func HandleGetAlbumPhotos(w http.ResponseWriter, r *http.Request) {
	albumIDStr := r.PathValue("id")
	albumID, err := strconv.Atoi(albumIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ALBUM_ID", "Invalid album ID")
		return
	}

	photos, err := GetAlbumPhotosWithMetadata(albumID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_ALBUM_PHOTOS_ERROR", "Failed to get album photos")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(photos)
}

func HandleRemovePhotosFromAlbum(w http.ResponseWriter, r *http.Request) {
	albumIDStr := r.PathValue("id")
	albumID, err := strconv.Atoi(albumIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ALBUM_ID", "Invalid album ID")
		return
	}

	var req struct {
		FilePaths []string `json:"filePaths"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if len(req.FilePaths) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_DATA", "File paths are required")
		return
	}

	if err := RemovePhotosFromAlbum(albumID, req.FilePaths); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "REMOVE_PHOTOS_ERROR", "Failed to remove photos from album")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func HandleDeleteAlbum(w http.ResponseWriter, r *http.Request) {
	albumIDStr := r.PathValue("id")
	albumID, err := strconv.Atoi(albumIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ALBUM_ID", "Invalid album ID")
		return
	}

	if err := DeleteAlbum(albumID); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "DELETE_ALBUM_ERROR", "Failed to delete album")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func HandleGetPhotoAlbums(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_FILE_PATH", "File path is required")
		return
	}

	albumIDs, err := GetPhotoAlbums(filePath)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_PHOTO_ALBUMS_ERROR", "Failed to get photo albums")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(albumIDs)
}

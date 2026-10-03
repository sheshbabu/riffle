package albums

import (
	"encoding/json"
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
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_ALBUMS_ERROR", "Failed to get albums", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, albums)
}

func HandleGetAlbum(w http.ResponseWriter, r *http.Request) {
	albumIDStr := r.PathValue("id")
	albumID, err := strconv.Atoi(albumIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ALBUM_ID", "Invalid album ID", nil)
		return
	}

	album, err := GetAlbumByID(albumID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_ALBUM_ERROR", "Failed to get album", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, album)
}

func HandleCreateAlbum(w http.ResponseWriter, r *http.Request) {
	var req CreateAlbumRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if req.Name == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_NAME", "Album name is required", nil)
		return
	}

	album, err := CreateAlbum(req.Name, req.Description)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "CREATE_ALBUM_ERROR", "Failed to create album", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusCreated, album)
}

func HandleAddPhotosToAlbums(w http.ResponseWriter, r *http.Request) {
	var req AddPhotosRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if len(req.AlbumIDs) == 0 || len(req.FilePaths) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_DATA", "Album IDs and file paths are required", nil)
		return
	}

	for _, albumID := range req.AlbumIDs {
		if err := AddPhotosToAlbum(albumID, req.FilePaths); err != nil {
			utils.SendErrorResponse(w, http.StatusInternalServerError, "ADD_PHOTOS_ERROR", "Failed to add photos to album", err)
			return
		}
	}

	utils.SendJSONResponse(w, http.StatusOK, map[string]bool{"success": true})
}

func HandleGetAlbumPhotos(w http.ResponseWriter, r *http.Request) {
	albumIDStr := r.PathValue("id")
	albumID, err := strconv.Atoi(albumIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ALBUM_ID", "Invalid album ID", nil)
		return
	}

	photos, err := GetAlbumPhotosWithMetadata(albumID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_ALBUM_PHOTOS_ERROR", "Failed to get album photos", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, photos)
}

func HandleRemovePhotosFromAlbum(w http.ResponseWriter, r *http.Request) {
	albumIDStr := r.PathValue("id")
	albumID, err := strconv.Atoi(albumIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ALBUM_ID", "Invalid album ID", nil)
		return
	}

	var req struct {
		FilePaths []string `json:"filePaths"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if len(req.FilePaths) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_DATA", "File paths are required", nil)
		return
	}

	if err := RemovePhotosFromAlbum(albumID, req.FilePaths); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "REMOVE_PHOTOS_ERROR", "Failed to remove photos from album", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, map[string]bool{"success": true})
}

func HandleDeleteAlbum(w http.ResponseWriter, r *http.Request) {
	albumIDStr := r.PathValue("id")
	albumID, err := strconv.Atoi(albumIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ALBUM_ID", "Invalid album ID", nil)
		return
	}

	if err := DeleteAlbum(albumID); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "DELETE_ALBUM_ERROR", "Failed to delete album", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, map[string]bool{"success": true})
}

func HandleGetPhotoAlbums(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_FILE_PATH", "File path is required", nil)
		return
	}

	albumIDs, err := GetPhotoAlbums(filePath)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_PHOTO_ALBUMS_ERROR", "Failed to get photo albums", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, albumIDs)
}

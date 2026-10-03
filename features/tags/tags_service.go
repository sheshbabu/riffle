package tags

import (
	"encoding/json"
	"net/http"
	"riffle/commons/utils"
	"strconv"
	"strings"
)

type CreateTagRequest struct {
	Name string `json:"name"`
}

type AddTagsRequest struct {
	TagIDs    []int    `json:"tagIds"`
	FilePaths []string `json:"filePaths"`
}

type RemoveTagRequest struct {
	TagID     int      `json:"tagId"`
	FilePaths []string `json:"filePaths"`
}

type UpdateTagRequest struct {
	Name string `json:"name"`
}

func HandleGetTags(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("query")

	var tags []Tag
	var err error

	if query != "" {
		tags, err = SearchTags(query)
	} else {
		tags, err = GetAllTags()
	}

	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_TAGS_ERROR", "Failed to get tags", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, tags)
}

func HandleCreateTag(w http.ResponseWriter, r *http.Request) {
	var req CreateTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_NAME", "Tag name is required", nil)
		return
	}

	tag, err := CreateTag(req.Name)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "CREATE_TAG_ERROR", "Failed to create tag", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusCreated, tag)
}

func HandleUpdateTag(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	tagID, err := strconv.Atoi(idStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ID", "Invalid tag ID", nil)
		return
	}

	var req UpdateTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_NAME", "Tag name is required", nil)
		return
	}

	if err := UpdateTag(tagID, req.Name); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "UPDATE_TAG_ERROR", "Failed to update tag", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func HandleDeleteTag(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	tagID, err := strconv.Atoi(idStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_ID", "Invalid tag ID", nil)
		return
	}

	if err := DeleteTag(tagID); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "DELETE_TAG_ERROR", "Failed to delete tag", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func HandleGetPhotoTags(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_PATH", "File path is required", nil)
		return
	}

	tags, err := GetPhotoTags(filePath)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_PHOTO_TAGS_ERROR", "Failed to get photo tags", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, tags)
}

func HandleAddTagsToPhotos(w http.ResponseWriter, r *http.Request) {
	var req AddTagsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if len(req.TagIDs) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_TAG_IDS", "Tag IDs are required", nil)
		return
	}

	if len(req.FilePaths) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_FILE_PATHS", "File paths are required", nil)
		return
	}

	if err := AddTagsToPhotos(req.TagIDs, req.FilePaths); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "ADD_TAGS_ERROR", "Failed to add tags to photos", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func HandleRemoveTagFromPhotos(w http.ResponseWriter, r *http.Request) {
	var req RemoveTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if req.TagID == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_TAG_ID", "Tag ID is required", nil)
		return
	}

	if len(req.FilePaths) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_FILE_PATHS", "File paths are required", nil)
		return
	}

	if err := RemoveTagFromPhotos(req.TagID, req.FilePaths); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "REMOVE_TAG_ERROR", "Failed to remove tag from photos", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

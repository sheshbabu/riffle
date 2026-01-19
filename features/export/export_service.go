package export

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"riffle/commons/utils"
)

type StartExportRequest struct {
	MinRating      int    `json:"minRating"`
	CurationStatus string `json:"curationStatus"`
}

func HandleStartExport(w http.ResponseWriter, r *http.Request) {
	var req StartExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.CurationStatus == "" {
		req.CurationStatus = "all"
	}

	if req.MinRating < 0 || req.MinRating > 5 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_RATING", "Rating must be between 0 and 5")
		return
	}

	exportPath := os.Getenv("EXPORT_PATH")
	if exportPath == "" {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "EXPORT_PATH_NOT_SET", "Export path not configured")
		return
	}

	criteria := ExportCriteria{
		MinRating:      req.MinRating,
		CurationStatus: req.CurationStatus,
	}

	StartExport(exportPath, criteria)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "started"})
}

func HandleGetExportProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetProgress()

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(progress); err != nil {
		slog.Error("error encoding export progress response", "error", err)
	}
}

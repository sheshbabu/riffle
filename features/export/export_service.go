package export

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"riffle/commons/utils"
)

type ExportSessionRequest struct {
	MinRating      int    `json:"minRating"`
	CurationStatus string `json:"curationStatus"`
}

type ExportSessionsResponse struct {
	ExportID        int64   `json:"export_id"`
	ExportPath      string  `json:"export_path"`
	MinRating       int     `json:"min_rating"`
	CurationStatus  *string `json:"curation_status,omitempty"`
	StartedAt       string  `json:"started_at"`
	CompletedAt     *string `json:"completed_at,omitempty"`
	DurationSeconds *int64  `json:"duration_seconds,omitempty"`
	TotalPhotos     int     `json:"total_photos"`
	ExportedPhotos  int     `json:"exported_photos"`
	ErrorCount      int     `json:"error_count"`
	ErrorMessage    *string `json:"error_message,omitempty"`
	Status          string  `json:"status"`
	CreatedAt       string  `json:"created_at"`
}

func HandleCreateExportSession(w http.ResponseWriter, r *http.Request) {
	var req ExportSessionRequest
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

func HandleExportProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetProgress()

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(progress); err != nil {
		slog.Error("error encoding export progress response", "error", err)
	}
}

func HandleGetExportSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := GetExportSessions(50)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "QUERY_ERROR", "Failed to retrieve export sessions")
		return
	}

	jsonSessions := make([]ExportSessionsResponse, 0, len(sessions))
	for _, s := range sessions {
		jsonSession := ExportSessionsResponse{
			ExportID:       s.ExportID,
			ExportPath:     s.ExportPath,
			MinRating:      s.MinRating,
			StartedAt:      s.StartedAt.Format("2006-01-02T15:04:05Z07:00"),
			TotalPhotos:    s.TotalPhotos,
			ExportedPhotos: s.ExportedPhotos,
			ErrorCount:     s.ErrorCount,
			Status:         s.Status,
			CreatedAt:      s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if s.CurationStatus.Valid {
			jsonSession.CurationStatus = &s.CurationStatus.String
		}

		if s.CompletedAt.Valid {
			completedStr := s.CompletedAt.Time.Format("2006-01-02T15:04:05Z07:00")
			jsonSession.CompletedAt = &completedStr
		}

		if s.DurationSeconds.Valid {
			jsonSession.DurationSeconds = &s.DurationSeconds.Int64
		}

		if s.ErrorMessage.Valid {
			jsonSession.ErrorMessage = &s.ErrorMessage.String
		}

		jsonSessions = append(jsonSessions, jsonSession)
	}

	if jsonSessions == nil {
		jsonSessions = []ExportSessionsResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(jsonSessions)
}

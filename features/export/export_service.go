package export

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"riffle/commons/progress"
	"riffle/commons/utils"
	"riffle/features/settings"
)

type ExportSessionRequest struct {
	MinRating      int    `json:"minRating"`
	CurationStatus string `json:"curationStatus"`
}

type ExportSessionsResponse struct {
	ExportID        int64   `json:"exportId"`
	ExportPath      string  `json:"exportPath"`
	MinRating       int     `json:"minRating"`
	CurationStatus  *string `json:"curationStatus,omitempty"`
	StartedAt       string  `json:"startedAt"`
	CompletedAt     *string `json:"completedAt,omitempty"`
	DurationSeconds *int64  `json:"durationSeconds,omitempty"`
	TotalPhotos     int     `json:"totalPhotos"`
	ExportedPhotos  int     `json:"exportedPhotos"`
	ErrorCount      int     `json:"errorCount"`
	ErrorMessage    *string `json:"errorMessage,omitempty"`
	Status          string  `json:"status"`
	CreatedAt       string  `json:"createdAt"`
}

func HandleCreateExportSession(w http.ResponseWriter, r *http.Request) {
	exportPath := os.Getenv("EXPORT_PATH")
	if exportPath == "" {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "EXPORT_PATH_NOT_SET", "Export path not configured", nil)
		return
	}

	if err := progress.StartOperation(progress.OperationExport); err != nil {
		currentOp := progress.Get()
		slog.Warn("cannot start export, operation already in progress", "current_operation", currentOp.Operation)
		utils.SendErrorResponse(w, http.StatusConflict, "OPERATION_IN_PROGRESS", fmt.Sprintf("Cannot start export: %s operation is already in progress", currentOp.Operation), nil)
		return
	}

	minRating := settings.GetExportMinRating()
	curationStatus := settings.GetExportCurationStatus()

	criteria := ExportCriteria{
		MinRating:      minRating,
		CurationStatus: curationStatus,
	}

	StartExport(exportPath, criteria)

	utils.SendJSONResponse(w, http.StatusOK, map[string]string{"status": "started"})
}

func HandleExportProgress(w http.ResponseWriter, r *http.Request) {
	utils.SendJSONResponse(w, http.StatusOK, progress.Get())
}

func HandleGetExportSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := GetExportSessions(50)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "QUERY_ERROR", "Failed to retrieve export sessions", err)
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

	utils.SendJSONResponse(w, http.StatusOK, jsonSessions)
}

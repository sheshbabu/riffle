package ingest

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"riffle/commons/utils"
	"riffle/features/settings"
	"time"
)

type ImportSessionResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	SessionID int64  `json:"sessionId,omitempty"`
}

type ImportSessionsResponse struct {
	ImportID          int64   `json:"import_id"`
	ImportPath        string  `json:"import_path"`
	ImportMode        string  `json:"import_mode"`
	StartedAt         string  `json:"started_at"`
	CompletedAt       *string `json:"completed_at,omitempty"`
	DurationSeconds   *int64  `json:"duration_seconds,omitempty"`
	TotalScanned      int     `json:"total_scanned"`
	AlreadyImported   int     `json:"already_imported"`
	UniqueFiles       int     `json:"unique_files"`
	DuplicateGroups   int     `json:"duplicate_groups"`
	DuplicatesRemoved int     `json:"duplicates_removed"`
	MovedToLibrary    int     `json:"moved_to_library"`
	ErrorCount        int     `json:"error_count"`
	ErrorMessage      *string `json:"error_message,omitempty"`
	Status            string  `json:"status"`
	CreatedAt         string  `json:"created_at"`
}

func HandleImportProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetProgress()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(progress)
}

func HandleGetImportSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := GetImportSessions(50)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "QUERY_ERROR", "Failed to retrieve import sessions")
		return
	}

	jsonSessions := make([]ImportSessionsResponse, 0, len(sessions))
	for _, s := range sessions {
		jsonSession := ImportSessionsResponse{
			ImportID:          s.ImportID,
			ImportPath:        s.ImportPath,
			ImportMode:        s.ImportMode,
			StartedAt:         s.StartedAt.Format("2006-01-02T15:04:05Z07:00"),
			TotalScanned:      s.TotalScanned,
			AlreadyImported:   s.AlreadyImported,
			UniqueFiles:       s.UniqueFiles,
			DuplicateGroups:   s.DuplicateGroups,
			DuplicatesRemoved: s.DuplicatesRemoved,
			MovedToLibrary:    s.MovedToLibrary,
			ErrorCount:        s.ErrorCount,
			Status:            s.Status,
			CreatedAt:         s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
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
		jsonSessions = []ImportSessionsResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(jsonSessions)
}

func HandleCreateImportSession(w http.ResponseWriter, r *http.Request) {
	importPath := os.Getenv("IMPORT_PATH")
	libraryPath := os.Getenv("LIBRARY_PATH")
	thumbnailsPath := os.Getenv("THUMBNAILS_PATH")

	importMode, _ := settings.GetSetting("import_mode")

	ClearResults()
	UpdateProgress(StatusScanning, 0, 0)

	sessionID, err := CreateImportSession(importPath, importMode)
	if err != nil {
		slog.Error("failed to create import session", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "SESSION_CREATE_ERROR", "Failed to create import session")
		return
	}
	SetCurrentImportSessionID(sessionID)

	go func() {
		startedAt := time.Now()

		stats, err := ProcessIngest(importPath, libraryPath)
		if err != nil {
			slog.Error("import analysis failed", "error", err)
			if sessionID > 0 {
				CompleteImportSession(sessionID, &AnalysisStats{}, startedAt, err.Error())
			}
			return
		}

		if sessionID > 0 {
			UpdateImportSessionStats(sessionID, stats)
			UpdateImportSessionStatus(sessionID, "importing")
		}

		SetResults(stats)
		UpdateProgress(StatusScanningComplete, stats.TotalScanned, stats.TotalScanned)
		slog.Info("scan complete, starting import", "totalScanned", stats.TotalScanned)

		if err := ExecuteMoves(libraryPath, thumbnailsPath, stats, importMode); err != nil {
			slog.Error("failed to execute import", "error", err)
			if sessionID > 0 {
				CompleteImportSession(sessionID, stats, startedAt, err.Error())
			}
			return
		}

		if sessionID > 0 {
			CompleteImportSession(sessionID, stats, startedAt, "")
		}

		SetResults(stats)
		slog.Info("import complete", "movedToLibrary", stats.MovedToLibrary, "importMode", importMode)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ImportSessionResponse{
		Success:   true,
		Message:   "import session started",
		SessionID: sessionID,
	})
}

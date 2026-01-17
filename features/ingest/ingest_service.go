package ingest

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"riffle/commons/utils"
	"riffle/features/settings"
)

type IngestResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func HandleScanImportFolder(w http.ResponseWriter, r *http.Request) {
	importPath := os.Getenv("IMPORT_PATH")
	libraryPath := os.Getenv("LIBRARY_PATH")

	ClearResults()
	UpdateProgress(StatusScanning, 0, 0)

	go func() {
		stats, err := ProcessIngest(importPath, libraryPath)
		if err != nil {
			slog.Error("import analysis failed", "error", err)
			return
		}

		SetResults(stats)
		UpdateProgress(StatusScanningComplete, stats.TotalScanned, stats.TotalScanned)
		slog.Info("scan complete", "totalScanned", stats.TotalScanned)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(IngestResponse{
		Success: true,
		Message: "import analysis started",
	})
}

func HandleGetScanResults(w http.ResponseWriter, r *http.Request) {
	results := GetResults()
	if results == nil {
		utils.SendErrorResponse(w, http.StatusNotFound, "NO_RESULTS", "No scan results available")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(results)
}

func HandleImport(w http.ResponseWriter, r *http.Request) {
	libraryPath := os.Getenv("LIBRARY_PATH")
	thumbnailsPath := os.Getenv("THUMBNAILS_PATH")

	stats := GetResults()
	if stats == nil {
		utils.SendErrorResponse(w, http.StatusNotFound, "NO_RESULTS", "No scan results available. Run scan first.")
		return
	}

	importMode, err := settings.GetSetting("import_mode")
	if err != nil {
		slog.Error("failed to get import mode setting, using default (move)", "error", err)
		importMode = "move"
	}
	copyMode := importMode == "copy"

	go func() {
		if err := ExecuteMoves(libraryPath, thumbnailsPath, stats, copyMode); err != nil {
			slog.Error("failed to execute moves", "error", err)
			return
		}

		SetResults(stats)
		slog.Info("import complete", "movedToLibrary", stats.MovedToLibrary, "copyMode", copyMode)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(IngestResponse{
		Success: true,
		Message: "import started",
	})
}

func HandleImportProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetProgress()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(progress)
}

package ingest

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
)

type IngestResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func HandleScanImportFolder(w http.ResponseWriter, r *http.Request) {
	importPath := os.Getenv("IMPORT_PATH")
	libraryPath := os.Getenv("LIBRARY_PATH")

	ClearResults()
	UpdateProgress("scanning", 0, 0)

	go func() {
		stats, err := ProcessIngest(importPath, libraryPath, libraryPath)
		if err != nil {
			slog.Error("import analysis failed", "error", err)
			return
		}

		SetResults(stats)
		UpdateProgress("complete", stats.TotalScanned, stats.TotalScanned)
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
		http.Error(w, "no results available", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(results)
}

func HandleImport(w http.ResponseWriter, r *http.Request) {
	libraryPath := os.Getenv("LIBRARY_PATH")

	stats := GetResults()
	if stats == nil {
		http.Error(w, "no analysis results available - run analysis first", http.StatusNotFound)
		return
	}

	go func() {
		if err := ExecuteMoves(libraryPath, libraryPath, stats); err != nil {
			slog.Error("failed to execute moves", "error", err)
			return
		}

		SetResults(stats)
		slog.Info("import complete", "movedToLibrary", stats.MovedToLibrary)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(IngestResponse{
		Success: true,
		Message: "import started",
	})
}

func HandleScanProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetProgress()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(progress)
}

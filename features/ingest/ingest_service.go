package ingest

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"riffle/commons/utils"
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
		UpdateProgress(StatusComplete, stats.TotalScanned, stats.TotalScanned)
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

type ImportRequest struct {
	CopyMode bool `json:"copyMode"`
}

func HandleImport(w http.ResponseWriter, r *http.Request) {
	libraryPath := os.Getenv("LIBRARY_PATH")

	var req ImportRequest
	if r.Body != nil {
		json.NewDecoder(r.Body).Decode(&req)
	}

	stats := GetResults()
	if stats == nil {
		utils.SendErrorResponse(w, http.StatusNotFound, "NO_RESULTS", "No scan results available. Run scan first.")
		return
	}

	copyMode := req.CopyMode

	go func() {
		if err := ExecuteMoves(libraryPath, stats, copyMode); err != nil {
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

func HandleScanProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetProgress()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(progress)
}

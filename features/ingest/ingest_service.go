package ingest

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"sync"
)

type IngestResponse struct {
	Success    bool   `json:"success"`
	Message    string `json:"message"`
	importPath string `json:"importPath,omitempty"`
}

type ProgressStatus struct {
	Status    string `json:"status"`
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
	Percent   int    `json:"percent"`
}

var (
	progressMutex   sync.RWMutex
	currentProgress ProgressStatus
)

const resultsFilePath = "/tmp/riffle-ingest-results.json"

func UpdateProgress(status string, completed, total int) {
	progressMutex.Lock()
	defer progressMutex.Unlock()

	percent := 0
	if total > 0 {
		percent = int(float64(completed) / float64(total) * 100)
	}

	currentProgress = ProgressStatus{
		Status:    status,
		Completed: completed,
		Total:     total,
		Percent:   percent,
	}
}

func GetProgress() ProgressStatus {
	progressMutex.RLock()
	defer progressMutex.RUnlock()
	return currentProgress
}

func HandleScanImportFolder(w http.ResponseWriter, r *http.Request) {
	importPath := os.Getenv("IMPORT_PATH")
	libraryPath := os.Getenv("LIBRARY_PATH")

	os.Remove(resultsFilePath)
	UpdateProgress("scanning", 0, 0)

	go func() {
		stats, err := ProcessIngest(importPath, libraryPath, libraryPath)
		if err != nil {
			slog.Error("import analysis failed", "error", err)
			return
		}

		data, err := json.MarshalIndent(stats, "", "  ")
		if err != nil {
			slog.Error("failed to marshal stats", "error", err)
			return
		}

		if err := os.WriteFile(resultsFilePath, data, 0644); err != nil {
			slog.Error("failed to write results file", "error", err)
			return
		}

		UpdateProgress("complete", stats.TotalScanned, stats.TotalScanned)
		slog.Info("results written to file", "path", resultsFilePath)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(IngestResponse{
		Success: true,
		Message: "import analysis started",
	})
}

func HandleGetScanResults(w http.ResponseWriter, r *http.Request) {
	data, err := os.ReadFile(resultsFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "no results available", http.StatusNotFound)
			return
		}
		slog.Error("failed to read results file", "error", err)
		http.Error(w, "failed to read results", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func HandleImport(w http.ResponseWriter, r *http.Request) {
	libraryPath := os.Getenv("LIBRARY_PATH")

	data, err := os.ReadFile(resultsFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "no analysis results available - run analysis first", http.StatusNotFound)
			return
		}
		slog.Error("failed to read results file", "error", err)
		http.Error(w, "failed to read results", http.StatusInternalServerError)
		return
	}

	var stats AnalysisStats
	if err := json.Unmarshal(data, &stats); err != nil {
		slog.Error("failed to unmarshal stats", "error", err)
		http.Error(w, "invalid results format", http.StatusInternalServerError)
		return
	}

	go func() {
		if err := ExecuteMoves(libraryPath, libraryPath, &stats); err != nil {
			slog.Error("failed to execute moves", "error", err)
			return
		}

		data, err := json.MarshalIndent(stats, "", "  ")
		if err != nil {
			slog.Error("failed to marshal updated stats", "error", err)
			return
		}

		if err := os.WriteFile(resultsFilePath, data, 0644); err != nil {
			slog.Error("failed to update results file", "error", err)
			return
		}

		slog.Info("execution completed and results updated")
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

package dedupe

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
)

type DedupeRequest struct {
	InboxPath   string `json:"inboxPath"`
	LibraryPath string `json:"libraryPath"`
	TrashPath   string `json:"trashPath"`
	IsDryRun    bool   `json:"isDryRun"`
}

type DedupeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

const resultsFilePath = "/tmp/riffle-dedupe-results.json"

func HandleDedupe(w http.ResponseWriter, r *http.Request) {
	var req DedupeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("failed to decode request", "error", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.InboxPath == "" || req.LibraryPath == "" || req.TrashPath == "" {
		http.Error(w, "all folder paths are required", http.StatusBadRequest)
		return
	}

	if err := checkDirectories(req.InboxPath, req.LibraryPath, req.TrashPath); err != nil {
		slog.Error("directory check failed", "error", err)
		http.Error(w, fmt.Sprintf("directory check failed: %v", err), http.StatusBadRequest)
		return
	}

	// Remove old results file
	os.Remove(resultsFilePath)

	go func() {
		stats, err := ProcessInbox(req.InboxPath, req.LibraryPath, req.TrashPath, req.IsDryRun)
		if err != nil {
			slog.Error("deduplication failed", "error", err)
			return
		}

		// Write results to file
		data, err := json.MarshalIndent(stats, "", "  ")
		if err != nil {
			slog.Error("failed to marshal stats", "error", err)
			return
		}

		if err := os.WriteFile(resultsFilePath, data, 0644); err != nil {
			slog.Error("failed to write results file", "error", err)
			return
		}

		slog.Info("results written to file", "path", resultsFilePath)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(DedupeResponse{
		Success: true,
		Message: "deduplication started",
	})
}

func HandleDedupeResults(w http.ResponseWriter, r *http.Request) {
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

func checkDirectories(paths ...string) error {
	for _, path := range paths {
		info, err := os.Stat(path)
		if err != nil {
			if os.IsNotExist(err) {
				return fmt.Errorf("directory does not exist: %s", path)
			}
			return err
		}
		if !info.IsDir() {
			return fmt.Errorf("path is not a directory: %s", path)
		}
	}
	return nil
}

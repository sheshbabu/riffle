package photos

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"riffle/commons/utils"
)

type BurstRebuildResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func HandleRebuildBurstData(w http.ResponseWriter, r *http.Request) {
	currentProgress := GetBurstProgress()
	if currentProgress.Status == StatusBurstRebuildProcessing {
		utils.SendErrorResponse(w, http.StatusConflict, "REBUILD_IN_PROGRESS", "Burst data rebuild already in progress")
		return
	}

	go func() {
		if err := RebuildBurstData(); err != nil {
			slog.Error("failed to rebuild burst data", "error", err)
			return
		}
		slog.Info("burst data rebuild completed")
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(BurstRebuildResponse{
		Success: true,
		Message: "burst data rebuild started",
	})
}

func HandleGetBurstRebuildProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetBurstProgress()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(progress)
}

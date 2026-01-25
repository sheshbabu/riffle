package photos

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"riffle/commons/utils"
)

type GroupRebuildResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func HandleRebuildGroups(w http.ResponseWriter, r *http.Request) {
	currentProgress := GetGroupProgress()
	if currentProgress.Status == StatusGroupRebuildProcessing {
		utils.SendErrorResponse(w, http.StatusConflict, "REBUILD_IN_PROGRESS", "Group rebuild already in progress")
		return
	}

	go func() {
		if err := RebuildGroups(); err != nil {
			slog.Error("failed to rebuild groups", "error", err)
			return
		}
		slog.Info("group rebuild completed")
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(GroupRebuildResponse{
		Success: true,
		Message: "group rebuild started",
	})
}

func HandleGetGroupRebuildProgress(w http.ResponseWriter, r *http.Request) {
	progress := GetGroupProgress()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(progress)
}

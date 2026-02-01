package photos

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"riffle/commons/progress"
	"riffle/commons/utils"
)

type BurstRebuildResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func HandleRebuildBurstData(w http.ResponseWriter, r *http.Request) {
	if err := progress.StartOperation(progress.OperationBurstRebuild); err != nil {
		currentOp := progress.Get()
		slog.Warn("cannot start burst rebuild, operation already in progress", "current_operation", currentOp.Operation)
		utils.SendErrorResponse(w, http.StatusConflict, "OPERATION_IN_PROGRESS", fmt.Sprintf("Cannot start burst rebuild: %s operation is already in progress", currentOp.Operation))
		return
	}

	go func() {
		defer progress.CompleteOperation()
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
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(progress.Get())
}

package settings

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"riffle/commons/utils"
)

type UpdateSettingRequest struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func HandleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := GetAllSettings()
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_SETTINGS_ERROR", "Failed to get settings")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(settings); err != nil {
		slog.Error("error encoding settings response", "error", err)
	}
}

func HandleUpdateSetting(w http.ResponseWriter, r *http.Request) {
	var req UpdateSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Key == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_KEY", "Setting key is required")
		return
	}

	if err := UpsertSetting(req.Key, req.Value); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "UPDATE_SETTING_ERROR", "Failed to update setting")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

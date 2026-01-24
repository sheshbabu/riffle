package settings

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"riffle/commons/utils"
	"strconv"
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

	if err := validate(req.Key, req.Value); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_VALUE", err.Error())
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

func validate(key, value string) error {
	switch key {
	case "export_min_rating":
		rating, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("export_min_rating must be a number")
		}
		if rating < 0 || rating > 5 {
			return fmt.Errorf("export_min_rating must be between 0 and 5")
		}
	case "export_curation_status":
		if value != "all" && value != "pick" {
			return fmt.Errorf("export_curation_status must be 'all' or 'pick'")
		}
	case "import_mode":
		if value != "move" && value != "copy" {
			return fmt.Errorf("import_mode must be 'move' or 'copy'")
		}
	}
	return nil
}

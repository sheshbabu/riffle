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

type ImportMode string
type ExportCurationStatus string
type ExportOrganizationMode string

const (
	ImportModeMove ImportMode = "move"
	ImportModeCopy ImportMode = "copy"
)

const (
	ExportCurationAll  ExportCurationStatus = "all"
	ExportCurationPick ExportCurationStatus = "pick"
)

const (
	ExportOrgFlat      ExportOrganizationMode = "flat"
	ExportOrgOrganized ExportOrganizationMode = "organized"
)

func GetImportMode() ImportMode {
	return ImportMode(getStringSetting("import_mode", string(ImportModeMove)))
}

func GetExportMinRating() int {
	return getIntSetting("export_min_rating", 0)
}

func GetExportCurationStatus() ExportCurationStatus {
	return ExportCurationStatus(getStringSetting("export_curation_status", string(ExportCurationAll)))
}

func GetExportOrganizationMode() ExportOrganizationMode {
	return ExportOrganizationMode(getStringSetting("export_organization_mode", string(ExportOrgOrganized)))
}

func GetExportDeduplicationEnabled() bool {
	return getBoolSetting("export_deduplication_enabled", true)
}

func GetExportCleanupEnabled() bool {
	return getBoolSetting("export_cleanup_enabled", false)
}

func GetBurstDetectionEnabled() bool {
	return getBoolSetting("burst_detection_enabled", false)
}

func GetBurstTimeThreshold() int {
	return getIntSetting("burst_time_threshold", 3)
}

func GetBurstDhashThreshold() int {
	return getIntSetting("burst_dhash_threshold", 4)
}

func getStringSetting(key string, defaultValue string) string {
	value, err := GetSetting(key)
	if err != nil {
		slog.Error("failed to read setting, using default", "key", key, "default", defaultValue, "error", err)
		return defaultValue
	}
	return value
}

func getBoolSetting(key string, defaultValue bool) bool {
	return getStringSetting(key, strconv.FormatBool(defaultValue)) == "true"
}

func getIntSetting(key string, defaultValue int) int {
	value := getStringSetting(key, strconv.Itoa(defaultValue))
	number, err := strconv.Atoi(value)
	if err != nil {
		slog.Error("invalid setting value, using default", "key", key, "value", value, "default", defaultValue)
		return defaultValue
	}
	return number
}

func HandleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := GetAllSettings()
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "GET_SETTINGS_ERROR", "Failed to get settings", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, settings)
}

func HandleUpdateSetting(w http.ResponseWriter, r *http.Request) {
	var req UpdateSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if req.Key == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "MISSING_KEY", "Setting key is required", nil)
		return
	}

	if err := validate(req.Key, req.Value); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "INVALID_VALUE", err.Error(), nil)
		return
	}

	if err := UpsertSetting(req.Key, req.Value); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "UPDATE_SETTING_ERROR", "Failed to update setting", err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
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
		status := ExportCurationStatus(value)
		if status != ExportCurationAll && status != ExportCurationPick {
			return fmt.Errorf("export_curation_status must be '%s' or '%s'", ExportCurationAll, ExportCurationPick)
		}
	case "export_organization_mode":
		mode := ExportOrganizationMode(value)
		if mode != ExportOrgFlat && mode != ExportOrgOrganized {
			return fmt.Errorf("export_organization_mode must be '%s' or '%s'", ExportOrgFlat, ExportOrgOrganized)
		}
	case "export_deduplication_enabled":
		if value != "true" && value != "false" {
			return fmt.Errorf("export_deduplication_enabled must be 'true' or 'false'")
		}
	case "export_cleanup_enabled":
		if value != "true" && value != "false" {
			return fmt.Errorf("export_cleanup_enabled must be 'true' or 'false'")
		}
	case "import_mode":
		mode := ImportMode(value)
		if mode != ImportModeMove && mode != ImportModeCopy {
			return fmt.Errorf("import_mode must be '%s' or '%s'", ImportModeMove, ImportModeCopy)
		}
	case "burst_detection_enabled":
		if value != "true" && value != "false" {
			return fmt.Errorf("burst_detection_enabled must be 'true' or 'false'")
		}
	case "burst_time_threshold":
		threshold, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("burst_time_threshold must be a number")
		}
		if threshold < 1 || threshold > 60 {
			return fmt.Errorf("burst_time_threshold must be between 1 and 60")
		}
	case "burst_dhash_threshold":
		threshold, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("burst_dhash_threshold must be a number")
		}
		if threshold < 0 || threshold > 64 {
			return fmt.Errorf("burst_dhash_threshold must be between 0 and 64")
		}
	}
	return nil
}

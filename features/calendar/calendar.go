package calendar

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"riffle/commons/utils"
)

type CalendarResponse struct {
	Months []CalendarMonth `json:"months"`
}

func HandleGetCalendarMonths(w http.ResponseWriter, r *http.Request) {
	months, err := GetCalendarMonths()
	if err != nil {
		slog.Error("failed to get calendar months", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch calendar months")
		return
	}

	response := CalendarResponse{
		Months: months,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

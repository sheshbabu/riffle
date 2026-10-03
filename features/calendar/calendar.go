package calendar

import (
	"net/http"
	"riffle/commons/cache"
	"riffle/commons/utils"
)

type CalendarResponse struct {
	Months []CalendarMonth `json:"months"`
}

func HandleGetCalendarMonths(w http.ResponseWriter, r *http.Request) {
	if cache.CalendarCache.CheckAndRespond(w, r, 3600) {
		return
	}

	months, err := GetCalendarMonths()
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch calendar months", err)
		return
	}

	response := CalendarResponse{
		Months: months,
	}

	utils.SendJSONResponse(w, http.StatusOK, response)
}

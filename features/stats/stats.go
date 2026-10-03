package stats

import (
	"net/http"
	"riffle/commons/utils"
)

type StatsResponse struct {
	Months []MonthStats `json:"months"`
	Totals TotalStats   `json:"totals"`
}

func HandleGetStats(w http.ResponseWriter, r *http.Request) {
	months, err := GetMonthlyStats()
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch stats", err)
		return
	}

	totals, err := GetTotalStats()
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch stats", err)
		return
	}

	response := StatsResponse{
		Months: months,
		Totals: totals,
	}

	utils.SendJSONResponse(w, http.StatusOK, response)
}

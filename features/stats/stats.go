package stats

import (
	"log/slog"
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
		slog.Error("failed to get stats", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch stats")
		return
	}

	totals, err := GetTotalStats()
	if err != nil {
		slog.Error("failed to get total stats", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "FETCH_ERROR", "Failed to fetch stats")
		return
	}

	response := StatsResponse{
		Months: months,
		Totals: totals,
	}

	utils.SendJSONResponse(w, http.StatusOK, response)
}

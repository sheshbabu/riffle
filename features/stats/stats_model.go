package stats

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"time"
)

type MonthStats struct {
	Year           int    `json:"year"`
	Month          int    `json:"month"`
	MonthName      string `json:"monthName"`
	CuratedCount   int    `json:"curatedCount"`
	UncuratedCount int    `json:"uncuratedCount"`
	TrashedCount   int    `json:"trashedCount"`
}

func GetMonthlyStats() ([]MonthStats, error) {
	query := `
		SELECT
			strftime('%Y', date_time) as year,
			strftime('%m', date_time) as month,
			SUM(CASE WHEN is_curated = 1 AND is_trashed = 0 THEN 1 ELSE 0 END) as curated_count,
			SUM(CASE WHEN is_curated = 0 AND is_trashed = 0 THEN 1 ELSE 0 END) as uncurated_count,
			SUM(CASE WHEN is_trashed = 1 THEN 1 ELSE 0 END) as trashed_count
		FROM photos
		WHERE date_time IS NOT NULL
		GROUP BY year, month
		ORDER BY year ASC, month ASC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error querying monthly stats: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var months []MonthStats
	for rows.Next() {
		var m MonthStats
		var yearStr, monthStr string
		err := rows.Scan(&yearStr, &monthStr, &m.CuratedCount, &m.UncuratedCount, &m.TrashedCount)
		if err != nil {
			slog.Error("error scanning monthly stats row", "error", err)
			continue
		}

		fmt.Sscanf(yearStr, "%d", &m.Year)
		fmt.Sscanf(monthStr, "%d", &m.Month)
		m.MonthName = getShortMonthName(m.Month)

		months = append(months, m)
	}

	return months, nil
}

func getShortMonthName(month int) string {
	if month < 1 || month > 12 {
		return ""
	}
	t := time.Date(2000, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	return t.Format("Jan")
}

package stats

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
)

type MonthStats struct {
	Year           int `json:"year"`
	Month          int `json:"month"`
	CuratedCount   int `json:"curatedCount"`
	UncuratedCount int `json:"uncuratedCount"`
	TrashedCount   int `json:"trashedCount"`
}

type TotalStats struct {
	Total     int `json:"total"`
	Curated   int `json:"curated"`
	Uncurated int `json:"uncurated"`
	Trashed   int `json:"trashed"`
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
		months = append(months, m)
	}

	return months, nil
}

func GetTotalStats() (TotalStats, error) {
	query := `
		SELECT
			COUNT(*) as total,
			SUM(CASE WHEN is_curated = 1 AND is_trashed = 0 THEN 1 ELSE 0 END) as curated,
			SUM(CASE WHEN is_curated = 0 AND is_trashed = 0 THEN 1 ELSE 0 END) as uncurated,
			SUM(CASE WHEN is_trashed = 1 THEN 1 ELSE 0 END) as trashed
		FROM photos
	`

	var stats TotalStats
	err := sqlite.DB.QueryRow(query).Scan(&stats.Total, &stats.Curated, &stats.Uncurated, &stats.Trashed)
	if err != nil {
		err = fmt.Errorf("error querying total stats: %w", err)
		slog.Error(err.Error())
		return stats, err
	}

	return stats, nil
}

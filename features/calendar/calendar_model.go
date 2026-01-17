package calendar

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"time"
)

type CalendarMonth struct {
	Year            int     `json:"year"`
	Month           int     `json:"month"`
	MonthName       string  `json:"monthName"`
	CuratedPhotos   int     `json:"curatedPhotos"`
	UncuratedPhotos int     `json:"uncuratedPhotos"`
	CoverPhotoPath  *string `json:"coverPhotoPath"`
}

func GetCalendarMonths() ([]CalendarMonth, error) {
	query := `
		WITH month_stats AS (
			SELECT
				strftime('%Y', date_time) as year,
				strftime('%m', date_time) as month,
				strftime('%Y-%m', date_time) as year_month,
				SUM(CASE WHEN is_curated = 1 THEN 1 ELSE 0 END) as curated_count,
				SUM(CASE WHEN is_curated = 0 THEN 1 ELSE 0 END) as uncurated_count
			FROM photos
			WHERE date_time IS NOT NULL
			  AND is_trashed = 0
			GROUP BY year_month
		),
		cover_photos AS (
			SELECT DISTINCT
				strftime('%Y-%m', date_time) as year_month,
				FIRST_VALUE(file_path) OVER (
					PARTITION BY strftime('%Y-%m', date_time)
					ORDER BY rating DESC, date_time ASC
				) as cover_photo
			FROM photos
			WHERE date_time IS NOT NULL
			  AND is_trashed = 0
		)
		SELECT
			ms.year,
			ms.month,
			ms.curated_count,
			ms.uncurated_count,
			cp.cover_photo
		FROM month_stats ms
		LEFT JOIN cover_photos cp ON ms.year_month = cp.year_month
		ORDER BY ms.year DESC, ms.month DESC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error querying calendar months: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var months []CalendarMonth
	for rows.Next() {
		var m CalendarMonth
		var yearStr, monthStr string
		err := rows.Scan(&yearStr, &monthStr, &m.CuratedPhotos, &m.UncuratedPhotos, &m.CoverPhotoPath)
		if err != nil {
			slog.Error("error scanning calendar month row", "error", err)
			continue
		}

		year := parseYear(yearStr)
		month := parseMonth(monthStr)

		m.Year = year
		m.Month = month
		m.MonthName = getShortMonthName(month)

		months = append(months, m)
	}

	return months, nil
}

func parseYear(yearStr string) int {
	var year int
	fmt.Sscanf(yearStr, "%d", &year)
	return year
}

func parseMonth(monthStr string) int {
	var month int
	fmt.Sscanf(monthStr, "%d", &month)
	return month
}

func getShortMonthName(month int) string {
	if month < 1 || month > 12 {
		return ""
	}
	t := time.Date(2000, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	return t.Format("Jan")
}

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
		SELECT
			strftime('%Y', date_time) as year,
			strftime('%m', date_time) as month,
			SUM(CASE WHEN is_curated = 1 THEN 1 ELSE 0 END) as curated_count,
			SUM(CASE WHEN is_curated = 0 THEN 1 ELSE 0 END) as uncurated_count,
			(SELECT file_path FROM photos p2
			 WHERE strftime('%Y-%m', p2.date_time) = strftime('%Y-%m', p1.date_time)
			   AND p2.is_trashed = 0
			 ORDER BY p2.rating DESC, p2.date_time ASC
			 LIMIT 1) as cover_photo
		FROM photos p1
		WHERE date_time IS NOT NULL
		  AND is_trashed = 0
		GROUP BY strftime('%Y-%m', date_time)
		ORDER BY year DESC, month DESC
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

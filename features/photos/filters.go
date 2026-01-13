package photos

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"strings"
	"sync"
	"time"
)

type FilterOptions struct {
	CameraMakes  []string `json:"cameraMakes"`
	CameraModels []string `json:"cameraModels"`
	Countries    []string `json:"countries"`
	States       []string `json:"states"`
	Cities       []string `json:"cities"`
	FileFormats  []string `json:"fileFormats"`
	Years        []int    `json:"years"`
}

type PhotoFilters struct {
	Ratings      []int    `json:"ratings"`
	MediaType    string   `json:"mediaType"`
	Orientation  string   `json:"orientation"`
	Years        []int    `json:"years"`
	CameraMakes  []string `json:"cameraMakes"`
	CameraModels []string `json:"cameraModels"`
	Countries    []string `json:"countries"`
	States       []string `json:"states"`
	Cities       []string `json:"cities"`
	FileFormats  []string `json:"fileFormats"`
}

var (
	filterOptionsCache     *FilterOptions
	filterOptionsCacheTime time.Time
	filterOptionsCacheMu   sync.RWMutex
	filterOptionsCacheTTL  = 5 * time.Minute
)

func InvalidateFilterOptionsCache() {
	filterOptionsCacheMu.Lock()
	defer filterOptionsCacheMu.Unlock()
	filterOptionsCache = nil
}

func BuildFilterConditions(filters *PhotoFilters) (string, []any) {
	if filters == nil {
		return "", nil
	}

	var conditions []string
	var args []any

	if len(filters.Ratings) > 0 {
		placeholders := make([]string, len(filters.Ratings))
		for i, r := range filters.Ratings {
			placeholders[i] = "?"
			args = append(args, r)
		}
		conditions = append(conditions, fmt.Sprintf("rating IN (%s)", strings.Join(placeholders, ",")))
	}

	switch filters.MediaType {
	case "photos":
		conditions = append(conditions, "is_video = 0")
	case "videos":
		conditions = append(conditions, "is_video = 1")
	}

	switch filters.Orientation {
	case "landscape":
		conditions = append(conditions, "CAST(width AS INTEGER) > CAST(height AS INTEGER)")
	case "portrait":
		conditions = append(conditions, "CAST(width AS INTEGER) < CAST(height AS INTEGER)")
	case "square":
		conditions = append(conditions, "CAST(width AS INTEGER) = CAST(height AS INTEGER)")
	}

	if len(filters.Years) > 0 {
		placeholders := make([]string, len(filters.Years))
		for i, y := range filters.Years {
			placeholders[i] = "?"
			args = append(args, y)
		}
		conditions = append(conditions, fmt.Sprintf("CAST(strftime('%%Y', date_time) AS INTEGER) IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filters.CameraMakes) > 0 {
		placeholders := make([]string, len(filters.CameraMakes))
		for i, m := range filters.CameraMakes {
			placeholders[i] = "?"
			args = append(args, m)
		}
		conditions = append(conditions, fmt.Sprintf("camera_make IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filters.CameraModels) > 0 {
		placeholders := make([]string, len(filters.CameraModels))
		for i, m := range filters.CameraModels {
			placeholders[i] = "?"
			args = append(args, m)
		}
		conditions = append(conditions, fmt.Sprintf("camera_model IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filters.Countries) > 0 {
		placeholders := make([]string, len(filters.Countries))
		for i, c := range filters.Countries {
			placeholders[i] = "?"
			args = append(args, c)
		}
		conditions = append(conditions, fmt.Sprintf("country_code IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filters.States) > 0 {
		placeholders := make([]string, len(filters.States))
		for i, s := range filters.States {
			placeholders[i] = "?"
			args = append(args, s)
		}
		conditions = append(conditions, fmt.Sprintf("state IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filters.Cities) > 0 {
		placeholders := make([]string, len(filters.Cities))
		for i, c := range filters.Cities {
			placeholders[i] = "?"
			args = append(args, c)
		}
		conditions = append(conditions, fmt.Sprintf("city IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filters.FileFormats) > 0 {
		placeholders := make([]string, len(filters.FileFormats))
		for i, f := range filters.FileFormats {
			placeholders[i] = "?"
			args = append(args, f)
		}
		conditions = append(conditions, fmt.Sprintf("file_format IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(conditions) == 0 {
		return "", nil
	}

	return " AND " + strings.Join(conditions, " AND "), args
}

func GetFilterOptions() (*FilterOptions, error) {
	filterOptionsCacheMu.RLock()
	if filterOptionsCache != nil && time.Since(filterOptionsCacheTime) < filterOptionsCacheTTL {
		cached := filterOptionsCache
		filterOptionsCacheMu.RUnlock()
		return cached, nil
	}
	filterOptionsCacheMu.RUnlock()

	filterOptionsCacheMu.Lock()
	defer filterOptionsCacheMu.Unlock()

	if filterOptionsCache != nil && time.Since(filterOptionsCacheTime) < filterOptionsCacheTTL {
		return filterOptionsCache, nil
	}

	options := &FilterOptions{
		CameraMakes:  []string{},
		CameraModels: []string{},
		Countries:    []string{},
		States:       []string{},
		Cities:       []string{},
		FileFormats:  []string{},
		Years:        []int{},
	}

	cameraMakes, err := getDistinctStrings("camera_make")
	if err != nil {
		return nil, err
	}
	options.CameraMakes = cameraMakes

	cameraModels, err := getDistinctStrings("camera_model")
	if err != nil {
		return nil, err
	}
	options.CameraModels = cameraModels

	countries, err := getDistinctStrings("country_code")
	if err != nil {
		return nil, err
	}
	options.Countries = countries

	states, err := getDistinctStrings("state")
	if err != nil {
		return nil, err
	}
	options.States = states

	cities, err := getDistinctStrings("city")
	if err != nil {
		return nil, err
	}
	options.Cities = cities

	fileFormats, err := getDistinctStrings("file_format")
	if err != nil {
		return nil, err
	}
	options.FileFormats = fileFormats

	years, err := getDistinctYears()
	if err != nil {
		return nil, err
	}
	options.Years = years

	filterOptionsCache = options
	filterOptionsCacheTime = time.Now()

	return options, nil
}

func getDistinctStrings(column string) ([]string, error) {
	query := fmt.Sprintf(`
		SELECT DISTINCT %s
		FROM photos
		WHERE %s IS NOT NULL AND %s != ''
		ORDER BY %s ASC
	`, column, column, column, column)

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error querying distinct %s: %w", column, err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var values []string
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			continue
		}
		values = append(values, value)
	}

	if values == nil {
		values = []string{}
	}

	return values, nil
}

func getDistinctYears() ([]int, error) {
	query := `
		SELECT DISTINCT CAST(strftime('%Y', date_time) AS INTEGER) as year
		FROM photos
		WHERE date_time IS NOT NULL
		ORDER BY year DESC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error querying distinct years: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var years []int
	for rows.Next() {
		var year int
		if err := rows.Scan(&year); err != nil {
			continue
		}
		years = append(years, year)
	}

	if years == nil {
		years = []int{}
	}

	return years, nil
}

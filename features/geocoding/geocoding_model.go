package geocoding

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
)

type Location struct {
	City        string
	State       string
	CountryName string
}

const defaultEpsilon = 0.1

func ReverseGeocode(latitude, longitude float64) (*Location, error) {
	return reverseGeocodeWithEpsilon(latitude, longitude, defaultEpsilon)
}

func reverseGeocodeWithEpsilon(latitude, longitude, epsilon float64) (*Location, error) {
	query := `
		SELECT c.name, c.state, c.country_name,
			((c.latitude - ?) * (c.latitude - ?) + (c.longitude - ?) * (c.longitude - ?)) AS dist
		FROM cities_rtree r
		JOIN cities c ON r.id = c.geoname_id
		WHERE r.min_lat >= ? AND r.max_lat <= ?
		  AND r.min_lon >= ? AND r.max_lon <= ?
		ORDER BY dist ASC
		LIMIT 1
	`

	minLat := latitude - epsilon
	maxLat := latitude + epsilon
	minLon := longitude - epsilon
	maxLon := longitude + epsilon

	var location Location
	var dist float64
	err := sqlite.DB.QueryRow(query,
		latitude, latitude, longitude, longitude,
		minLat, maxLat, minLon, maxLon,
	).Scan(&location.City, &location.State, &location.CountryName, &dist)

	if errors.Is(err, sql.ErrNoRows) {
		if epsilon < 1.0 {
			return reverseGeocodeWithEpsilon(latitude, longitude, epsilon*2)
		}
		return nil, nil
	}

	if err != nil {
		slog.Error("error in reverse geocoding", "error", err)
		return nil, fmt.Errorf("error in reverse geocoding: %w", err)
	}

	return &location, nil
}

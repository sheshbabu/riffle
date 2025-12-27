package geocoding

import (
	"bufio"
	"fmt"
	"log/slog"
	"os"
	"riffle/commons/sqlite"
	"strconv"
	"strings"
)

const defaultGeonamesPath = ".geonames"
const admin1FileName = "admin1CodesASCII.txt"
const citiesFileName = "cities1000.txt"

func Init() error {
	path := os.Getenv("GEONAMES_PATH")
	if path == "" {
		path = defaultGeonamesPath
	}

	count, err := getCitiesCount()
	if err != nil {
		return fmt.Errorf("error checking cities count: %w", err)
	}

	if count > 0 {
		slog.Info("geocoding data already loaded", "cities", count)
		return nil
	}

	admin1Path := path + "/" + admin1FileName
	citiesPath := path + "/" + citiesFileName

	if _, err := os.Stat(admin1Path); os.IsNotExist(err) {
		slog.Warn("geonames admin1 file not found, geocoding disabled", "path", admin1Path)
		return nil
	}

	if _, err := os.Stat(citiesPath); os.IsNotExist(err) {
		slog.Warn("geonames cities file not found, geocoding disabled", "path", citiesPath)
		return nil
	}

	slog.Info("loading geocoding data from geonames files")

	adminMap, err := parseAdmin1Codes(admin1Path)
	if err != nil {
		return fmt.Errorf("error parsing admin1 codes: %w", err)
	}

	err = loadCities(citiesPath, adminMap)
	if err != nil {
		return fmt.Errorf("error loading cities: %w", err)
	}

	count, _ = getCitiesCount()
	slog.Info("geocoding data loaded successfully", "cities", count)

	return nil
}

func parseAdmin1Codes(path string) (map[string]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("error opening admin1 file: %w", err)
	}
	defer file.Close()

	adminMap := make(map[string]string)
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Split(line, "\t")
		if len(fields) >= 2 {
			adminMap[fields[0]] = fields[1]
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error scanning admin1 file: %w", err)
	}

	slog.Info("parsed admin1 codes", "count", len(adminMap))
	return adminMap, nil
}

func loadCities(path string, adminMap map[string]string) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("error opening cities file: %w", err)
	}
	defer file.Close()

	tx, err := sqlite.DB.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}

	cityStmt, err := tx.Prepare("INSERT INTO cities (geoname_id, name, state, country_code, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)")
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing city statement: %w", err)
	}
	defer cityStmt.Close()

	rtreeStmt, err := tx.Prepare("INSERT INTO cities_rtree (id, min_lat, max_lat, min_lon, max_lon) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing rtree statement: %w", err)
	}
	defer rtreeStmt.Close()

	scanner := bufio.NewScanner(file)
	count := 0

	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Split(line, "\t")

		if len(fields) < 11 {
			continue
		}

		geonameID, err := strconv.Atoi(fields[0])
		if err != nil {
			continue
		}

		name := fields[1]
		lat, err := strconv.ParseFloat(fields[4], 64)
		if err != nil {
			continue
		}

		lon, err := strconv.ParseFloat(fields[5], 64)
		if err != nil {
			continue
		}

		countryCode := fields[8]
		admin1Code := fields[10]

		state := ""
		if admin1Code != "" {
			adminKey := countryCode + "." + admin1Code
			state = adminMap[adminKey]
		}

		_, err = cityStmt.Exec(geonameID, name, state, countryCode, lat, lon)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting city: %w", err)
		}

		_, err = rtreeStmt.Exec(geonameID, lat, lat, lon, lon)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting rtree: %w", err)
		}

		count++
		if count%50000 == 0 {
			slog.Info("loading cities", "count", count)
		}
	}

	if err := scanner.Err(); err != nil {
		tx.Rollback()
		return fmt.Errorf("error scanning cities file: %w", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %w", err)
	}

	return nil
}

func getCitiesCount() (int, error) {
	var count int
	err := sqlite.DB.QueryRow("SELECT COUNT(*) FROM cities").Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

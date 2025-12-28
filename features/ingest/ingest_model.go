package ingest

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"riffle/commons/utils"
	"riffle/features/geocoding"
	"time"
)

func CreatePhoto(photo PhotoFile) error {
	query := `
		INSERT INTO photos (
			file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration,
			file_created_at, file_modified_at,
			city, state, country_code
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(file_path) DO UPDATE SET
			sha256_hash = excluded.sha256_hash,
			dhash = excluded.dhash,
			file_size = excluded.file_size,
			date_time = excluded.date_time,
			camera_make = excluded.camera_make,
			camera_model = excluded.camera_model,
			width = excluded.width,
			height = excluded.height,
			orientation = excluded.orientation,
			latitude = excluded.latitude,
			longitude = excluded.longitude,
			iso = excluded.iso,
			f_number = excluded.f_number,
			exposure_time = excluded.exposure_time,
			focal_length = excluded.focal_length,
			file_format = excluded.file_format,
			mime_type = excluded.mime_type,
			is_video = excluded.is_video,
			duration = excluded.duration,
			file_created_at = excluded.file_created_at,
			file_modified_at = excluded.file_modified_at,
			city = excluded.city,
			state = excluded.state,
			country_code = excluded.country_code,
			updated_at = CURRENT_TIMESTAMP
	`

	var dateTime interface{}
	if dtStr, ok := photo.ExifData["DateTime"].(string); ok {
		dateTime = parseExifDateTime(dtStr, photo.ExifData)
	}

	var cameraMake, cameraModel interface{}
	if make, ok := photo.ExifData["Make"].(string); ok {
		cameraMake = make
	}
	if model, ok := photo.ExifData["Model"].(string); ok {
		cameraModel = model
	}

	var width, height, orientation, iso interface{}
	if w, ok := photo.ExifData["Width"].(string); ok {
		width = w
	}
	if h, ok := photo.ExifData["Height"].(string); ok {
		height = h
	}
	if o, ok := photo.ExifData["Orientation"].(string); ok {
		orientation = o
	}
	if i, ok := photo.ExifData["ISO"].(string); ok {
		iso = i
	}

	var latitude, longitude interface{}
	if lat, ok := photo.ExifData["Latitude"].(string); ok {
		latitude = lat
	}
	if lon, ok := photo.ExifData["Longitude"].(string); ok {
		longitude = lon
	}

	var fNumber, exposureTime, focalLength interface{}
	if fn, ok := photo.ExifData["FNumber"].(string); ok {
		fNumber = fn
	}
	if et, ok := photo.ExifData["ExposureTime"].(string); ok {
		exposureTime = et
	}
	if fl, ok := photo.ExifData["FocalLength"].(string); ok {
		focalLength = fl
	}

	var duration interface{}
	if d, ok := photo.ExifData["Duration"].(string); ok {
		duration = d
	}

	var dhashStr interface{}
	if photo.Dhash != 0 {
		dhashStr = fmt.Sprintf("%016x", photo.Dhash)
	}

	var fileCreatedAt, fileModifiedAt interface{}
	if !photo.FileCreatedAt.IsZero() {
		fileCreatedAt = photo.FileCreatedAt
	}
	if !photo.FileModifiedAt.IsZero() {
		fileModifiedAt = photo.FileModifiedAt
	}

	var city, state, countryCode interface{}
	if latStr, ok := photo.ExifData["Latitude"].(string); ok {
		if lonStr, ok := photo.ExifData["Longitude"].(string); ok {
			lat := utils.ParseDMSOrDecimal(latStr)
			lon := utils.ParseDMSOrDecimal(lonStr)
			if lat != 0 && lon != 0 {
				location, err := geocoding.ReverseGeocode(lat, lon)
				if err == nil && location != nil {
					city = location.City
					state = location.State
					countryCode = location.CountryCode
				}
			}
		}
	}

	_, err := sqlite.DB.Exec(
		query,
		photo.Path, photo.Hash, dhashStr, photo.Size, dateTime,
		cameraMake, cameraModel, width, height, orientation,
		latitude, longitude, iso, fNumber, exposureTime, focalLength,
		photo.FileFormat, photo.MimeType, photo.IsVideo, duration,
		fileCreatedAt, fileModifiedAt,
		city, state, countryCode,
	)

	if err != nil {
		err = fmt.Errorf("error inserting photo: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

// parseExifDateTime parses EXIF DateTime and determines the correct timezone.
// Priority:
// 1. If OffsetTimeOriginal exists (e.g., "+08:00"), use it
// 2. If GPSDateTime exists (UTC), calculate offset from DateTime - GPSDateTime
// 3. Otherwise, return datetime as-is (local capture time, no timezone)
func parseExifDateTime(dtStr string, exifData map[string]any) string {
	// Parse the datetime string into components
	formats := []string{
		"2006:01:02 15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}

	var parsedTime time.Time
	var parsed bool
	for _, format := range formats {
		if dt, err := time.Parse(format, dtStr); err == nil {
			parsedTime = dt
			parsed = true
			break
		}
	}

	if !parsed {
		return dtStr
	}

	// Option 1: Use OffsetTimeOriginal if available (e.g., "+08:00")
	if offsetStr, ok := exifData["OffsetTimeOriginal"].(string); ok && offsetStr != "" {
		return parsedTime.Format("2006-01-02 15:04:05") + offsetStr
	}

	// Option 2: Calculate offset from GPSDateTime (UTC)
	if gpsDateTimeStr, ok := exifData["GPSDateTime"].(string); ok && gpsDateTimeStr != "" {
		gpsFormats := []string{
			"2006:01:02 15:04:05Z",
			"2006-01-02 15:04:05Z",
			"2006:01:02 15:04:05",
			"2006-01-02 15:04:05",
		}
		for _, format := range gpsFormats {
			if gpsTime, err := time.Parse(format, gpsDateTimeStr); err == nil {
				offsetSeconds := int(parsedTime.Sub(gpsTime).Seconds())
				offsetHours := offsetSeconds / 3600
				offsetMins := (offsetSeconds % 3600) / 60
				if offsetMins < 0 {
					offsetMins = -offsetMins
				}
				sign := "+"
				if offsetHours < 0 {
					sign = "-"
					offsetHours = -offsetHours
				}
				offsetStr := fmt.Sprintf("%s%02d:%02d", sign, offsetHours, offsetMins)
				return parsedTime.Format("2006-01-02 15:04:05") + offsetStr
			}
		}
	}

	// Option 3: No timezone info available, return as local capture time (no timezone suffix)
	return parsedTime.Format("2006-01-02 15:04:05")
}

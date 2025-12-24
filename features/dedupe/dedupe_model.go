package dedupe

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"time"
)

func CreatePhoto(photo PhotoFile) error {
	query := `
		INSERT INTO photos (
			file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			updated_at = CURRENT_TIMESTAMP
	`

	var dateTime interface{}
	if dtStr, ok := photo.ExifData["DateTime"].(string); ok {
		formats := []string{
			"2006:01:02 15:04:05",
			"2006-01-02 15:04:05",
			"2006:01:02 15:04:05-07:00",
			"2006-01-02T15:04:05",
		}
		for _, format := range formats {
			if dt, err := time.Parse(format, dtStr); err == nil {
				dateTime = dt
				break
			}
		}
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

	_, err := sqlite.DB.Exec(
		query,
		photo.Path, photo.Hash, dhashStr, photo.Size, dateTime,
		cameraMake, cameraModel, width, height, orientation,
		latitude, longitude, iso, fNumber, exposureTime, focalLength,
		photo.FileFormat, photo.MimeType, photo.IsVideo, duration,
	)

	if err != nil {
		err = fmt.Errorf("error inserting photo: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

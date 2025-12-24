package photos

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
)

type Photo struct {
	ID           int64   `json:"id"`
	FilePath     string  `json:"filePath"`
	Sha256Hash   string  `json:"sha256Hash"`
	Dhash        *string `json:"dhash,omitempty"`
	FileSize     int64   `json:"fileSize"`
	DateTime     *string `json:"dateTime,omitempty"`
	CameraMake   *string `json:"cameraMake,omitempty"`
	CameraModel  *string `json:"cameraModel,omitempty"`
	Width        *string `json:"width,omitempty"`
	Height       *string `json:"height,omitempty"`
	Orientation  *string `json:"orientation,omitempty"`
	Latitude     *string `json:"latitude,omitempty"`
	Longitude    *string `json:"longitude,omitempty"`
	ISO          *string `json:"iso,omitempty"`
	FNumber      *string `json:"fNumber,omitempty"`
	ExposureTime *string `json:"exposureTime,omitempty"`
	FocalLength  *string `json:"focalLength,omitempty"`
	FileFormat   string  `json:"fileFormat"`
	MimeType     string  `json:"mimeType"`
	IsVideo      bool    `json:"isVideo"`
	Duration     *string `json:"duration,omitempty"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

func GetPhotos(limit, offset int) ([]Photo, error) {
	query := `
		SELECT
			id, file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration, created_at, updated_at
		FROM photos
		ORDER BY date_time DESC, created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := sqlite.DB.Query(query, limit, offset)
	if err != nil {
		err = fmt.Errorf("error querying photos: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var photos []Photo
	for rows.Next() {
		var p Photo
		err := rows.Scan(
			&p.ID, &p.FilePath, &p.Sha256Hash, &p.Dhash, &p.FileSize, &p.DateTime,
			&p.CameraMake, &p.CameraModel, &p.Width, &p.Height, &p.Orientation,
			&p.Latitude, &p.Longitude, &p.ISO, &p.FNumber, &p.ExposureTime, &p.FocalLength,
			&p.FileFormat, &p.MimeType, &p.IsVideo, &p.Duration, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			err = fmt.Errorf("error scanning photo row: %w", err)
			slog.Error(err.Error())
			continue
		}
		photos = append(photos, p)
	}

	return photos, nil
}

func GetPhoto(id int64) (*Photo, error) {
	query := `
		SELECT
			id, file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration, created_at, updated_at
		FROM photos
		WHERE id = ?
	`

	var p Photo
	err := sqlite.DB.QueryRow(query, id).Scan(
		&p.ID, &p.FilePath, &p.Sha256Hash, &p.Dhash, &p.FileSize, &p.DateTime,
		&p.CameraMake, &p.CameraModel, &p.Width, &p.Height, &p.Orientation,
		&p.Latitude, &p.Longitude, &p.ISO, &p.FNumber, &p.ExposureTime, &p.FocalLength,
		&p.FileFormat, &p.MimeType, &p.IsVideo, &p.Duration, &p.CreatedAt, &p.UpdatedAt,
	)

	if err != nil {
		err = fmt.Errorf("error getting photo: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return &p, nil
}

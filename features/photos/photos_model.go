package photos

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
)

type Photo struct {
	FilePath       string  `json:"filePath"`
	Sha256Hash     string  `json:"sha256Hash"`
	Dhash          *string `json:"dhash,omitempty"`
	FileSize       int64   `json:"fileSize"`
	DateTime       *string `json:"dateTime,omitempty"`
	CameraMake     *string `json:"cameraMake,omitempty"`
	CameraModel    *string `json:"cameraModel,omitempty"`
	Width          *string `json:"width,omitempty"`
	Height         *string `json:"height,omitempty"`
	Orientation    *string `json:"orientation,omitempty"`
	Latitude       *string `json:"latitude,omitempty"`
	Longitude      *string `json:"longitude,omitempty"`
	ISO            *string `json:"iso,omitempty"`
	FNumber        *string `json:"fNumber,omitempty"`
	ExposureTime   *string `json:"exposureTime,omitempty"`
	FocalLength    *string `json:"focalLength,omitempty"`
	FileFormat     string  `json:"fileFormat"`
	MimeType       string  `json:"mimeType"`
	IsVideo        bool    `json:"isVideo"`
	Duration       *string `json:"duration,omitempty"`
	FileCreatedAt  *string `json:"fileCreatedAt,omitempty"`
	FileModifiedAt *string `json:"fileModifiedAt,omitempty"`
	City           *string `json:"city,omitempty"`
	State          *string `json:"state,omitempty"`
	CountryCode    *string `json:"countryCode,omitempty"`
	IsCurated      bool    `json:"isCurated"`
	IsTrashed      bool    `json:"isTrashed"`
	Rating         int     `json:"rating"`
	Notes          *string `json:"notes,omitempty"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
	ThumbnailPath  *string `json:"thumbnailPath,omitempty"`
	GroupID        *int64  `json:"groupId,omitempty"`
	TotalRecords   int     `json:"totalRecords,omitempty"`
}

func GetPhotos(limit, offset int) ([]Photo, error) {
	totalCount := getCount("WHERE is_curated = 1 AND is_trashed = 0")

	query := `
		SELECT
			file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration,
			file_created_at, file_modified_at,
			city, state, country_code,
			is_curated, is_trashed, rating, notes,
			created_at, updated_at,
			thumbnail_path, group_id
		FROM photos
		WHERE is_curated = 1 AND is_trashed = 0
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
			&p.FilePath, &p.Sha256Hash, &p.Dhash, &p.FileSize, &p.DateTime,
			&p.CameraMake, &p.CameraModel, &p.Width, &p.Height, &p.Orientation,
			&p.Latitude, &p.Longitude, &p.ISO, &p.FNumber, &p.ExposureTime, &p.FocalLength,
			&p.FileFormat, &p.MimeType, &p.IsVideo, &p.Duration,
			&p.FileCreatedAt, &p.FileModifiedAt,
			&p.City, &p.State, &p.CountryCode,
			&p.IsCurated, &p.IsTrashed, &p.Rating, &p.Notes,
			&p.CreatedAt, &p.UpdatedAt,
			&p.ThumbnailPath, &p.GroupID,
		)
		if err != nil {
			err = fmt.Errorf("error scanning photo row: %w", err)
			slog.Error(err.Error())
			continue
		}
		p.TotalRecords = totalCount
		photos = append(photos, p)
	}

	return photos, nil
}

func GetPhoto(filePath string) (*Photo, error) {
	query := `
		SELECT
			file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration,
			file_created_at, file_modified_at,
			city, state, country_code,
			is_curated, is_trashed, rating, notes,
			created_at, updated_at,
			thumbnail_path, group_id
		FROM photos
		WHERE file_path = ?
	`

	var p Photo
	err := sqlite.DB.QueryRow(query, filePath).Scan(
		&p.FilePath, &p.Sha256Hash, &p.Dhash, &p.FileSize, &p.DateTime,
		&p.CameraMake, &p.CameraModel, &p.Width, &p.Height, &p.Orientation,
		&p.Latitude, &p.Longitude, &p.ISO, &p.FNumber, &p.ExposureTime, &p.FocalLength,
		&p.FileFormat, &p.MimeType, &p.IsVideo, &p.Duration,
		&p.FileCreatedAt, &p.FileModifiedAt,
		&p.City, &p.State, &p.CountryCode,
		&p.IsCurated, &p.IsTrashed, &p.Rating, &p.Notes,
		&p.CreatedAt, &p.UpdatedAt,
		&p.ThumbnailPath, &p.GroupID,
	)

	if err != nil {
		err = fmt.Errorf("error getting photo: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return &p, nil
}

func GetUncuratedPhotos(limit, offset int) ([]Photo, error) {
	totalCount := getCount("WHERE is_curated = 0")

	query := `
		SELECT
			file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration,
			file_created_at, file_modified_at,
			city, state, country_code,
			is_curated, is_trashed, rating, notes,
			created_at, updated_at,
			thumbnail_path, group_id
		FROM photos
		WHERE is_curated = 0
		ORDER BY date_time DESC, created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := sqlite.DB.Query(query, limit, offset)
	if err != nil {
		err = fmt.Errorf("error querying uncurated photos: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var photos []Photo
	for rows.Next() {
		var p Photo
		err := rows.Scan(
			&p.FilePath, &p.Sha256Hash, &p.Dhash, &p.FileSize, &p.DateTime,
			&p.CameraMake, &p.CameraModel, &p.Width, &p.Height, &p.Orientation,
			&p.Latitude, &p.Longitude, &p.ISO, &p.FNumber, &p.ExposureTime, &p.FocalLength,
			&p.FileFormat, &p.MimeType, &p.IsVideo, &p.Duration,
			&p.FileCreatedAt, &p.FileModifiedAt,
			&p.City, &p.State, &p.CountryCode,
			&p.IsCurated, &p.IsTrashed, &p.Rating, &p.Notes,
			&p.CreatedAt, &p.UpdatedAt,
			&p.ThumbnailPath, &p.GroupID,
		)
		if err != nil {
			err = fmt.Errorf("error scanning uncurated photo row: %w", err)
			slog.Error(err.Error())
			continue
		}
		p.TotalRecords = totalCount
		photos = append(photos, p)
	}

	return photos, nil
}

func GetTrashedPhotos(limit, offset int) ([]Photo, error) {
	totalCount := getCount("WHERE is_trashed = 1")

	query := `
		SELECT
			file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration,
			file_created_at, file_modified_at,
			city, state, country_code,
			is_curated, is_trashed, rating, notes,
			created_at, updated_at,
			thumbnail_path, group_id
		FROM photos
		WHERE is_trashed = 1
		ORDER BY
			updated_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := sqlite.DB.Query(query, limit, offset)
	if err != nil {
		err = fmt.Errorf("error querying trashed photos: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var photos []Photo
	for rows.Next() {
		var p Photo
		err := rows.Scan(
			&p.FilePath, &p.Sha256Hash, &p.Dhash, &p.FileSize, &p.DateTime,
			&p.CameraMake, &p.CameraModel, &p.Width, &p.Height, &p.Orientation,
			&p.Latitude, &p.Longitude, &p.ISO, &p.FNumber, &p.ExposureTime, &p.FocalLength,
			&p.FileFormat, &p.MimeType, &p.IsVideo, &p.Duration,
			&p.FileCreatedAt, &p.FileModifiedAt,
			&p.City, &p.State, &p.CountryCode,
			&p.IsCurated, &p.IsTrashed, &p.Rating, &p.Notes,
			&p.CreatedAt, &p.UpdatedAt,
			&p.ThumbnailPath, &p.GroupID,
		)
		if err != nil {
			err = fmt.Errorf("error scanning trashed photo row: %w", err)
			slog.Error(err.Error())
			continue
		}
		p.TotalRecords = totalCount
		photos = append(photos, p)
	}

	return photos, nil
}

func UpdatePhotoCuration(filePath string, isCurated, isTrashed bool, rating int) error {
	query := `
		UPDATE photos
		SET is_curated = ?, is_trashed = ?, rating = ?, updated_at = CURRENT_TIMESTAMP
		WHERE file_path = ?
	`

	_, err := sqlite.DB.Exec(query, isCurated, isTrashed, rating, filePath)
	if err != nil {
		err = fmt.Errorf("error updating photo curation: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

// To prevent full table scan
func getCount(whereClause string, args ...any) int {
	query := fmt.Sprintf("SELECT COUNT(*) FROM photos %s", whereClause)
	var count int
	err := sqlite.DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		slog.Error("error getting count", "error", err)
		return 0
	}
	return count
}

package photos

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
)

type Photo struct {
	FilePath         string   `json:"filePath"`
	OriginalFilepath *string  `json:"originalFilepath,omitempty"`
	Sha256Hash       string   `json:"sha256Hash"`
	Dhash            *string  `json:"dhash,omitempty"`
	FileSize         int64    `json:"fileSize"`
	DateTime         *string  `json:"dateTime,omitempty"`
	CameraMake       *string  `json:"cameraMake,omitempty"`
	CameraModel      *string  `json:"cameraModel,omitempty"`
	Width            *int     `json:"width,omitempty"`
	Height           *int     `json:"height,omitempty"`
	Orientation      *int     `json:"orientation,omitempty"`
	Latitude         *float64 `json:"latitude,omitempty"`
	Longitude        *float64 `json:"longitude,omitempty"`
	ISO              *int     `json:"iso,omitempty"`
	FNumber          *float64 `json:"fNumber,omitempty"`
	ExposureTime     *float64 `json:"exposureTime,omitempty"`
	FocalLength      *float64 `json:"focalLength,omitempty"`
	FileFormat       string   `json:"fileFormat"`
	MimeType         string   `json:"mimeType"`
	IsVideo          bool     `json:"isVideo"`
	Duration         *int     `json:"duration,omitempty"`
	FileCreatedAt    *string  `json:"fileCreatedAt,omitempty"`
	FileModifiedAt   *string  `json:"fileModifiedAt,omitempty"`
	City             *string  `json:"city,omitempty"`
	State            *string  `json:"state,omitempty"`
	CountryName      *string  `json:"countryCode,omitempty"`
	IsCurated        bool     `json:"isCurated"`
	IsTrashed        bool     `json:"isTrashed"`
	Rating           int      `json:"rating"`
	Notes            *string  `json:"notes,omitempty"`
	CreatedAt        string   `json:"createdAt"`
	UpdatedAt        string   `json:"updatedAt"`
	ThumbnailPath    *string  `json:"thumbnailPath,omitempty"`
	TotalRecords     int      `json:"totalRecords,omitempty"`
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

func GetPhotoByPath(filePath string) (Photo, error) {
	query := `
		SELECT
			file_path, original_filepath, sha256_hash, dhash, file_size,
			date_time, camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration, file_created_at, file_modified_at,
			city, state, country_name, is_curated, is_trashed, rating, notes,
			created_at, updated_at, thumbnail_path
		FROM photos
		WHERE file_path = ?
	`

	var photo Photo
	err := sqlite.DB.QueryRow(query, filePath).Scan(
		&photo.FilePath, &photo.OriginalFilepath, &photo.Sha256Hash, &photo.Dhash, &photo.FileSize,
		&photo.DateTime, &photo.CameraMake, &photo.CameraModel, &photo.Width, &photo.Height, &photo.Orientation,
		&photo.Latitude, &photo.Longitude, &photo.ISO, &photo.FNumber, &photo.ExposureTime, &photo.FocalLength,
		&photo.FileFormat, &photo.MimeType, &photo.IsVideo, &photo.Duration, &photo.FileCreatedAt, &photo.FileModifiedAt,
		&photo.City, &photo.State, &photo.CountryName, &photo.IsCurated, &photo.IsTrashed, &photo.Rating, &photo.Notes,
		&photo.CreatedAt, &photo.UpdatedAt, &photo.ThumbnailPath,
	)
	if err != nil {
		err = fmt.Errorf("error getting photo by path: %w", err)
		slog.Error(err.Error())
		return Photo{}, err
	}

	return photo, nil
}

func DeletePhotos(filePaths []string) error {
	if len(filePaths) == 0 {
		return nil
	}

	tx, err := sqlite.DB.Begin()
	if err != nil {
		err = fmt.Errorf("error starting transaction: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("DELETE FROM photos WHERE file_path = ?")
	if err != nil {
		err = fmt.Errorf("error preparing delete statement: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer stmt.Close()

	for _, filePath := range filePaths {
		if _, err := stmt.Exec(filePath); err != nil {
			err = fmt.Errorf("error deleting photo %s: %w", filePath, err)
			slog.Error(err.Error())
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		err = fmt.Errorf("error committing transaction: %w", err)
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

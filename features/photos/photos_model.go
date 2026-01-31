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

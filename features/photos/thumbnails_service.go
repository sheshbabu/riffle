package photos

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"riffle/commons/media"
	"riffle/commons/sqlite"
)

type PhotoForThumbnail struct {
	FilePath    string
	Orientation int
	IsVideo     bool
}

func RebuildThumbnails(libraryPath, thumbnailsPath string) error {
	slog.Info("starting thumbnail rebuild")

	allPhotos, err := GetAllPhotosForThumbnails()
	if err != nil {
		err = fmt.Errorf("failed to get photos from database: %w", err)
		slog.Error(err.Error())
		UpdateThumbnailProgress(StatusThumbnailRebuildIdle, 0, 0)
		return err
	}

	totalPhotos := len(allPhotos)
	if totalPhotos == 0 {
		slog.Info("no photos found to rebuild thumbnails")
		UpdateThumbnailProgress(StatusThumbnailRebuildComplete, 0, 0)
		return nil
	}

	slog.Info("rebuilding thumbnails", "totalPhotos", totalPhotos)
	UpdateThumbnailProgress(StatusThumbnailRebuildProcessing, 0, totalPhotos)

	completed := 0
	failed := 0

	for _, photo := range allPhotos {
		thumbnailPath := media.GetThumbnailPath(libraryPath, thumbnailsPath, photo.FilePath)

		if _, err := os.Stat(photo.FilePath); os.IsNotExist(err) {
			slog.Warn("photo file does not exist, skipping", "path", photo.FilePath)
			failed++
			completed++
			continue
		}

		if err := os.MkdirAll(filepath.Dir(thumbnailPath), 0755); err != nil {
			slog.Error("failed to create thumbnail directory", "path", thumbnailPath, "error", err)
			failed++
			completed++
			continue
		}

		if err := media.GenerateThumbnail(photo.FilePath, thumbnailPath, photo.Orientation, photo.IsVideo); err != nil {
			slog.Error("failed to generate thumbnail", "photo", photo.FilePath, "error", err)
			failed++
		}

		completed++
		if completed%100 == 0 || completed == totalPhotos {
			UpdateThumbnailProgress(StatusThumbnailRebuildProcessing, completed, totalPhotos)
		}
	}

	UpdateThumbnailProgress(StatusThumbnailRebuildComplete, totalPhotos, totalPhotos)
	slog.Info("thumbnail rebuild complete", "total", totalPhotos, "failed", failed)

	return nil
}

func GetAllPhotosForThumbnails() ([]PhotoForThumbnail, error) {
	query := `
		SELECT file_path, COALESCE(orientation, 1), is_video
		FROM photos
		ORDER BY date_time DESC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error getting all photos for thumbnails: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var photosList []PhotoForThumbnail
	for rows.Next() {
		var photo PhotoForThumbnail
		if err := rows.Scan(&photo.FilePath, &photo.Orientation, &photo.IsVideo); err != nil {
			slog.Error("error scanning photo row", "error", err)
			continue
		}
		photosList = append(photosList, photo)
	}

	return photosList, nil
}

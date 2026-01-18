package photos

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"riffle/commons/media"
	"riffle/commons/sqlite"
	"sync/atomic"
)

func RebuildThumbnails(libraryPath, thumbnailsPath string) error {
	slog.Info("starting thumbnail rebuild")

	UpdateThumbnailProgress(StatusThumbnailRebuildProcessing, 0, 0)

	allPhotos, err := GetAllPhotos()
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

	var completed atomic.Int32
	var failed atomic.Int32

	for _, photo := range allPhotos {
		photoPath := photo.FilePath
		thumbnailPath := media.GetThumbnailPath(libraryPath, thumbnailsPath, photoPath)

		if _, err := os.Stat(photoPath); os.IsNotExist(err) {
			slog.Warn("photo file does not exist, skipping", "path", photoPath)
			failed.Add(1)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(thumbnailPath), 0755); err != nil {
			slog.Error("failed to create thumbnail directory", "path", thumbnailPath, "error", err)
			failed.Add(1)
			continue
		}

		if err := media.GenerateThumbnail(photoPath, thumbnailPath); err != nil {
			slog.Error("failed to generate thumbnail", "photo", photoPath, "error", err)
			failed.Add(1)
		}

		completed.Add(1)
		if completed.Load()%100 == 0 {
			UpdateThumbnailProgress(StatusThumbnailRebuildProcessing, int(completed.Load()), totalPhotos)
		}
	}

	UpdateThumbnailProgress(StatusThumbnailRebuildComplete, totalPhotos, totalPhotos)
	slog.Info("thumbnail rebuild complete", "total", totalPhotos, "failed", failed.Load())

	return nil
}

func GetAllPhotos() ([]Photo, error) {
	query := `
		SELECT file_path
		FROM photos
		ORDER BY date_time DESC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error getting all photos: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var photosList []Photo
	for rows.Next() {
		var photo Photo
		if err := rows.Scan(&photo.FilePath); err != nil {
			slog.Error("error scanning photo row", "error", err)
			continue
		}
		photosList = append(photosList, photo)
	}

	return photosList, nil
}

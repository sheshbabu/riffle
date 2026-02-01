package photos

import (
	"fmt"
	"log/slog"
	"riffle/commons/hash"
	"riffle/commons/progress"
	"riffle/commons/sqlite"
	"sync/atomic"
)

func RebuildBurstData() error {
	slog.Info("starting burst data rebuild")

	progress.Update(progress.StatusProcessing, 0, 0, "Starting burst data rebuild")

	allPhotos, err := GetAllImagePhotos()
	if err != nil {
		err = fmt.Errorf("failed to get photos from database: %w", err)
		slog.Error(err.Error())
		progress.Update(progress.StatusError, 0, 0, err.Error())
		return err
	}

	totalPhotos := len(allPhotos)
	if totalPhotos == 0 {
		slog.Info("no image photos found to rebuild burst data")
		progress.Update(progress.StatusCompleted, 0, 0, "No photos to rebuild")
		return nil
	}

	slog.Info("rebuilding burst data", "totalPhotos", totalPhotos)
	progress.Update(progress.StatusProcessing, 0, totalPhotos, "Rebuilding burst data")

	var completed atomic.Int32
	var failed atomic.Int32

	for _, photo := range allPhotos {
		photoPath := photo.FilePath

		dhash, err := hash.ComputeDhash(photoPath)
		if err != nil {
			slog.Error("failed to compute dhash", "photo", photoPath, "error", err)
			failed.Add(1)
			completed.Add(1)
			continue
		}

		dhashStr := fmt.Sprintf("%016x", dhash)
		if err := UpdatePhotoDhash(photoPath, dhashStr); err != nil {
			slog.Error("failed to update dhash in database", "photo", photoPath, "error", err)
			failed.Add(1)
		}

		completed.Add(1)
		if completed.Load()%100 == 0 {
			progress.Update(progress.StatusProcessing, int(completed.Load()), totalPhotos, "Rebuilding burst data")
		}
	}

	progress.Update(progress.StatusCompleted, totalPhotos, totalPhotos, "Burst data rebuild completed")
	slog.Info("burst data rebuild complete", "total", totalPhotos, "failed", failed.Load())

	return nil
}

func GetAllImagePhotos() ([]Photo, error) {
	query := `
		SELECT file_path
		FROM photos
		WHERE is_video = 0
		ORDER BY date_time DESC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error getting all image photos: %w", err)
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

func UpdatePhotoDhash(filePath, dhash string) error {
	query := `
		UPDATE photos
		SET dhash = ?, updated_at = CURRENT_TIMESTAMP
		WHERE file_path = ?
	`

	_, err := sqlite.DB.Exec(query, dhash, filePath)
	if err != nil {
		err = fmt.Errorf("error updating photo dhash: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

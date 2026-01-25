package photos

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"riffle/features/settings"
	"time"
)

func RebuildGroups() error {
	slog.Info("starting group rebuild")

	UpdateGroupProgress(StatusGroupRebuildProcessing, 0, 0)

	timeGap, _ := settings.GetGroupTimeGap()
	distance, _ := settings.GetGroupDistance()

	slog.Info("rebuilding groups with settings", "timeGap", timeGap, "distance", distance)

	if err := clearAllGroups(); err != nil {
		err = fmt.Errorf("failed to clear existing groups: %w", err)
		slog.Error(err.Error())
		UpdateGroupProgress(StatusGroupRebuildIdle, 0, 0)
		return err
	}

	allPhotos, err := getAllPhotosForGrouping()
	if err != nil {
		err = fmt.Errorf("failed to get photos from database: %w", err)
		slog.Error(err.Error())
		UpdateGroupProgress(StatusGroupRebuildIdle, 0, 0)
		return err
	}

	totalPhotos := len(allPhotos)
	if totalPhotos == 0 {
		slog.Info("no photos found to rebuild groups")
		UpdateGroupProgress(StatusGroupRebuildComplete, 0, 0)
		return nil
	}

	slog.Info("rebuilding groups", "totalPhotos", totalPhotos)
	UpdateGroupProgress(StatusGroupRebuildProcessing, 0, totalPhotos)

	groupAssignments := detectGroupAssignments(allPhotos, timeGap, distance)

	groupIDMap := make(map[int64]int64)
	for photoIdx, tempGroupID := range groupAssignments {
		if tempGroupID == 0 {
			continue
		}

		photo := allPhotos[photoIdx]

		realGroupID, exists := groupIDMap[tempGroupID]
		if !exists {
			newGroupID, err := CreateGroup(time.Now(), time.Now(), nil, nil,
				photo.City, photo.State, photo.CountryName)
			if err != nil {
				slog.Error("failed to create group", "error", err)
				continue
			}
			groupIDMap[tempGroupID] = newGroupID
			realGroupID = newGroupID
		}

		err := updatePhotoGroupID(photo.FilePath, realGroupID)
		if err != nil {
			slog.Error("failed to update photo group", "file", photo.FilePath, "error", err)
		}

		if (photoIdx+1)%100 == 0 {
			UpdateGroupProgress(StatusGroupRebuildProcessing, photoIdx+1, totalPhotos)
		}
	}

	for _, realGroupID := range groupIDMap {
		if err := UpdateGroupMetadata(realGroupID); err != nil {
			slog.Error("failed to update group metadata", "groupID", realGroupID, "error", err)
		}
	}

	UpdateGroupProgress(StatusGroupRebuildComplete, totalPhotos, totalPhotos)
	slog.Info("group rebuild complete", "total", totalPhotos, "groups", len(groupIDMap))

	return nil
}

func clearAllGroups() error {
	tx, err := sqlite.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE photos SET group_id = NULL, updated_at = CURRENT_TIMESTAMP`); err != nil {
		return fmt.Errorf("failed to clear photo groups: %w", err)
	}

	if _, err := tx.Exec(`DELETE FROM photo_groups`); err != nil {
		return fmt.Errorf("failed to delete groups: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func getAllPhotosForGrouping() ([]Photo, error) {
	query := `
		SELECT file_path, original_filepath, sha256_hash, dhash, file_size, date_time,
		       camera_make, camera_model, width, height, orientation,
		       latitude, longitude, iso, f_number, exposure_time, focal_length,
		       file_format, mime_type, is_video, duration,
		       file_created_at, file_modified_at,
		       city, state, country_name,
		       is_curated, is_trashed, rating, notes,
		       created_at, updated_at,
		       thumbnail_path, group_id
		FROM photos
		ORDER BY date_time ASC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error getting all photos for grouping: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var photos []Photo
	for rows.Next() {
		var p Photo
		err := rows.Scan(
			&p.FilePath, &p.OriginalFilepath, &p.Sha256Hash, &p.Dhash, &p.FileSize, &p.DateTime,
			&p.CameraMake, &p.CameraModel, &p.Width, &p.Height, &p.Orientation,
			&p.Latitude, &p.Longitude, &p.ISO, &p.FNumber, &p.ExposureTime, &p.FocalLength,
			&p.FileFormat, &p.MimeType, &p.IsVideo, &p.Duration,
			&p.FileCreatedAt, &p.FileModifiedAt,
			&p.City, &p.State, &p.CountryName,
			&p.IsCurated, &p.IsTrashed, &p.Rating, &p.Notes,
			&p.CreatedAt, &p.UpdatedAt,
			&p.ThumbnailPath, &p.GroupID,
		)
		if err != nil {
			slog.Error("error scanning photo row", "error", err)
			continue
		}
		photos = append(photos, p)
	}

	return photos, nil
}


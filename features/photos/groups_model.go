package photos

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"riffle/commons/utils"
	"time"
)

type GroupRecord struct {
	GroupID     int64     `json:"groupId"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	PhotoCount  int       `json:"photoCount"`
	TotalSize   int64     `json:"totalSize"`
	Latitude    *float64  `json:"latitude,omitempty"`
	Longitude   *float64  `json:"longitude,omitempty"`
	City        *string   `json:"city,omitempty"`
	State       *string   `json:"state,omitempty"`
	CountryCode *string   `json:"countryCode,omitempty"`
	CreatedAt   string    `json:"createdAt"`
	UpdatedAt   string    `json:"updatedAt"`
}

func CreateGroup(startTime, endTime time.Time, lat, lon *float64, city, state, countryCode *string) (int64, error) {
	query := `
		INSERT INTO photo_groups (start_time, end_time, photo_count, total_size, latitude, longitude, city, state, country_code)
		VALUES (?, ?, 0, 0, ?, ?, ?, ?, ?)
	`
	result, err := sqlite.DB.Exec(query, startTime, endTime, lat, lon, city, state, countryCode)
	if err != nil {
		err = fmt.Errorf("error creating group: %w", err)
		slog.Error(err.Error())
		return 0, err
	}

	groupID, err := result.LastInsertId()
	if err != nil {
		err = fmt.Errorf("error getting group id: %w", err)
		slog.Error(err.Error())
		return 0, err
	}

	return groupID, nil
}

func GetGroupByID(groupID int64) (*GroupRecord, error) {
	query := `
		SELECT group_id, start_time, end_time, photo_count, total_size,
		       latitude, longitude, city, state, country_code,
		       created_at, updated_at
		FROM photo_groups
		WHERE group_id = ?
	`

	var g GroupRecord
	var startTime, endTime string
	err := sqlite.DB.QueryRow(query, groupID).Scan(
		&g.GroupID, &startTime, &endTime, &g.PhotoCount, &g.TotalSize,
		&g.Latitude, &g.Longitude, &g.City, &g.State, &g.CountryCode,
		&g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		err = fmt.Errorf("error getting group: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	g.StartTime = parseGroupTime(startTime)
	g.EndTime = parseGroupTime(endTime)

	return &g, nil
}

func GetGroupsByIDs(groupIDs []int64) ([]GroupRecord, error) {
	if len(groupIDs) == 0 {
		return []GroupRecord{}, nil
	}

	placeholders := ""
	args := make([]any, len(groupIDs))
	for i, id := range groupIDs {
		if i > 0 {
			placeholders += ", "
		}
		placeholders += "?"
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT group_id, start_time, end_time, photo_count, total_size,
		       latitude, longitude, city, state, country_code,
		       created_at, updated_at
		FROM photo_groups
		WHERE group_id IN (%s)
		ORDER BY start_time DESC
	`, placeholders)

	rows, err := sqlite.DB.Query(query, args...)
	if err != nil {
		err = fmt.Errorf("error getting groups by ids: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var groups []GroupRecord
	for rows.Next() {
		var g GroupRecord
		var startTime, endTime string
		err := rows.Scan(
			&g.GroupID, &startTime, &endTime, &g.PhotoCount, &g.TotalSize,
			&g.Latitude, &g.Longitude, &g.City, &g.State, &g.CountryCode,
			&g.CreatedAt, &g.UpdatedAt,
		)
		if err != nil {
			slog.Error("error scanning group row", "error", err)
			continue
		}
		g.StartTime = parseGroupTime(startTime)
		g.EndTime = parseGroupTime(endTime)
		groups = append(groups, g)
	}

	return groups, nil
}

func parseGroupTime(timeStr string) time.Time {
	if t := utils.ParseDateTime(timeStr); t != nil {
		return *t
	}
	return time.Time{}
}

func UpdateGroupMetadata(groupID int64) error {
	query := `
		UPDATE photo_groups
		SET photo_count = (SELECT COUNT(*) FROM photos WHERE group_id = ?),
		    total_size = (SELECT COALESCE(SUM(file_size), 0) FROM photos WHERE group_id = ?),
		    start_time = (SELECT MIN(date_time) FROM photos WHERE group_id = ?),
		    end_time = (SELECT MAX(date_time) FROM photos WHERE group_id = ?),
		    updated_at = CURRENT_TIMESTAMP
		WHERE group_id = ?
	`
	_, err := sqlite.DB.Exec(query, groupID, groupID, groupID, groupID, groupID)
	if err != nil {
		err = fmt.Errorf("error updating group metadata: %w", err)
		slog.Error(err.Error())
		return err
	}
	return nil
}

type AdjacentPhotos struct {
	Before *Photo
	After  *Photo
}

func GetAdjacentPhotos(photoTime time.Time) (*AdjacentPhotos, error) {
	result := &AdjacentPhotos{}

	// Format time as RFC3339 for consistent SQLite comparison
	photoTimeStr := photoTime.Format(time.RFC3339)

	beforeQuery := `
		SELECT file_path, sha256_hash, dhash, file_size, date_time,
		       camera_make, camera_model, width, height, orientation,
		       latitude, longitude, iso, f_number, exposure_time, focal_length,
		       file_format, mime_type, is_video, duration,
		       file_created_at, file_modified_at,
		       city, state, country_code,
		       is_curated, is_trashed, rating, notes,
		       created_at, updated_at,
		       thumbnail_path, group_id
		FROM photos
		WHERE date_time < ?
		ORDER BY date_time DESC
		LIMIT 1
	`

	var before Photo
	err := sqlite.DB.QueryRow(beforeQuery, photoTimeStr).Scan(
		&before.FilePath, &before.Sha256Hash, &before.Dhash, &before.FileSize, &before.DateTime,
		&before.CameraMake, &before.CameraModel, &before.Width, &before.Height, &before.Orientation,
		&before.Latitude, &before.Longitude, &before.ISO, &before.FNumber, &before.ExposureTime, &before.FocalLength,
		&before.FileFormat, &before.MimeType, &before.IsVideo, &before.Duration,
		&before.FileCreatedAt, &before.FileModifiedAt,
		&before.City, &before.State, &before.CountryCode,
		&before.IsCurated, &before.IsTrashed, &before.Rating, &before.Notes,
		&before.CreatedAt, &before.UpdatedAt,
		&before.ThumbnailPath, &before.GroupID,
	)
	if err == nil {
		result.Before = &before
	}

	afterQuery := `
		SELECT file_path, sha256_hash, dhash, file_size, date_time,
		       camera_make, camera_model, width, height, orientation,
		       latitude, longitude, iso, f_number, exposure_time, focal_length,
		       file_format, mime_type, is_video, duration,
		       file_created_at, file_modified_at,
		       city, state, country_code,
		       is_curated, is_trashed, rating, notes,
		       created_at, updated_at,
		       thumbnail_path, group_id
		FROM photos
		WHERE date_time > ?
		ORDER BY date_time ASC
		LIMIT 1
	`

	var after Photo
	err = sqlite.DB.QueryRow(afterQuery, photoTimeStr).Scan(
		&after.FilePath, &after.Sha256Hash, &after.Dhash, &after.FileSize, &after.DateTime,
		&after.CameraMake, &after.CameraModel, &after.Width, &after.Height, &after.Orientation,
		&after.Latitude, &after.Longitude, &after.ISO, &after.FNumber, &after.ExposureTime, &after.FocalLength,
		&after.FileFormat, &after.MimeType, &after.IsVideo, &after.Duration,
		&after.FileCreatedAt, &after.FileModifiedAt,
		&after.City, &after.State, &after.CountryCode,
		&after.IsCurated, &after.IsTrashed, &after.Rating, &after.Notes,
		&after.CreatedAt, &after.UpdatedAt,
		&after.ThumbnailPath, &after.GroupID,
	)
	if err == nil {
		result.After = &after
	}

	return result, nil
}

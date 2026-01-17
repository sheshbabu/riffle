package photos

import (
	"fmt"
	"log/slog"
	"math"
	"riffle/commons/sqlite"
	"riffle/commons/utils"
	"time"
)

type Group struct {
	GroupID    int64     `json:"groupId"`
	StartTime  time.Time `json:"startTime"`
	EndTime    time.Time `json:"endTime"`
	PhotoCount int       `json:"photoCount"`
	TotalSize  int64     `json:"totalSize"`
	Location   *string   `json:"location,omitempty"`
	Latitude   *float64  `json:"latitude,omitempty"`
	Longitude  *float64  `json:"longitude,omitempty"`
}

const (
	TimeGapThresholdMinutes = 120
	LocationRadiusKm        = 1.0
	MaxGroupDurationHours   = 12
)

func GetPhotosWithGroups(limit, offset int, filterCurated bool, filterTrashed bool, filters *PhotoFilters) ([]Photo, []Group, error) {
	var whereClause string
	if filterCurated && !filterTrashed {
		whereClause = "WHERE is_curated = 1 AND is_trashed = 0"
	} else if !filterCurated && !filterTrashed {
		whereClause = "WHERE is_curated = 0"
	} else if filterTrashed {
		whereClause = "WHERE is_trashed = 1"
	}

	filterConditions, filterArgs := BuildFilterConditions(filters)
	whereClause += filterConditions

	totalCount := getCount(whereClause, filterArgs...)

	groupIDs, err := getGroupIDsForPage(limit, offset, whereClause, filterArgs)
	if err != nil {
		return nil, nil, err
	}

	if len(groupIDs) == 0 {
		return []Photo{}, []Group{}, nil
	}

	groupPlaceholders := ""
	groupArgs := make([]any, len(groupIDs))
	for i, id := range groupIDs {
		if i > 0 {
			groupPlaceholders += ", "
		}
		groupPlaceholders += "?"
		groupArgs[i] = id
	}

	groupWhereClause := fmt.Sprintf("%s AND group_id IN (%s)", whereClause, groupPlaceholders)
	finalArgs := append(filterArgs, groupArgs...)

	query := fmt.Sprintf(`
		SELECT
			file_path, original_filepath, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration,
			file_created_at, file_modified_at,
			city, state, country_name,
			is_curated, is_trashed, rating, notes,
			created_at, updated_at,
			thumbnail_path, group_id
		FROM photos
		%s
		ORDER BY date_time DESC, created_at DESC
	`, groupWhereClause)

	rows, err := sqlite.DB.Query(query, finalArgs...)
	if err != nil {
		err = fmt.Errorf("error querying photos with groups: %w", err)
		slog.Error(err.Error())
		return nil, nil, err
	}
	defer rows.Close()

	var photos []Photo
	groupPhotoCount := make(map[int64]int)
	groupTotalSize := make(map[int64]int64)

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
			err = fmt.Errorf("error scanning photo row: %w", err)
			slog.Error(err.Error())
			continue
		}
		p.TotalRecords = totalCount
		photos = append(photos, p)

		if p.GroupID != nil {
			groupPhotoCount[*p.GroupID]++
			groupTotalSize[*p.GroupID] += p.FileSize
		}
	}

	var groups []Group
	if len(groupPhotoCount) > 0 {
		groupRecords, err := GetGroupsByIDs(groupIDs)
		if err != nil {
			slog.Error("failed to get groups by ids", "error", err)
		} else {
			for _, gr := range groupRecords {
				location := formatGroupLocation(gr.City, gr.State, gr.CountryName)
				groups = append(groups, Group{
					GroupID:    gr.GroupID,
					StartTime:  gr.StartTime,
					EndTime:    gr.EndTime,
					PhotoCount: groupPhotoCount[gr.GroupID],
					TotalSize:  groupTotalSize[gr.GroupID],
					Location:   location,
					Latitude:   gr.Latitude,
					Longitude:  gr.Longitude,
				})
			}
		}
	}

	return photos, groups, nil
}

func getGroupIDsForPage(limit, offset int, whereClause string, filterArgs []any) ([]int64, error) {
	query := fmt.Sprintf(`
		SELECT group_id, COUNT(*) as photo_count
		FROM photos
		%s AND group_id IS NOT NULL
		GROUP BY group_id
		ORDER BY MAX(date_time) DESC, MAX(created_at) DESC
	`, whereClause)

	rows, err := sqlite.DB.Query(query, filterArgs...)
	if err != nil {
		err = fmt.Errorf("error querying group counts: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	type groupCount struct {
		groupID int64
		count   int
	}

	var allGroups []groupCount
	for rows.Next() {
		var gc groupCount
		if err := rows.Scan(&gc.groupID, &gc.count); err != nil {
			slog.Error("error scanning group count", "error", err)
			continue
		}
		allGroups = append(allGroups, gc)
	}

	var groupIDs []int64
	currentPhotoCount := 0
	skippedPhotos := 0
	startedCollecting := false

	for _, gc := range allGroups {
		if !startedCollecting {
			if skippedPhotos+gc.count <= offset {
				skippedPhotos += gc.count
				continue
			}
			startedCollecting = true
		}

		if currentPhotoCount == 0 {
			groupIDs = append(groupIDs, gc.groupID)
			currentPhotoCount += gc.count
			if gc.count >= limit {
				break
			}
			continue
		}

		if currentPhotoCount+gc.count <= limit {
			groupIDs = append(groupIDs, gc.groupID)
			currentPhotoCount += gc.count
		} else {
			break
		}
	}

	return groupIDs, nil
}

func AssignGroupsToUngroupedPhotos() error {
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
		WHERE group_id IS NULL
		ORDER BY date_time ASC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		return fmt.Errorf("error querying ungrouped photos: %w", err)
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

	if len(photos) == 0 {
		return nil
	}

	slog.Info("assigning groups to ungrouped photos", "count", len(photos))

	groupAssignments := detectGroupAssignments(photos)

	groupIDMap := make(map[int64]int64)
	for photoIdx, tempGroupID := range groupAssignments {
		if tempGroupID == 0 {
			continue
		}

		photo := photos[photoIdx]

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
	}

	for _, realGroupID := range groupIDMap {
		if err := UpdateGroupMetadata(realGroupID); err != nil {
			slog.Error("failed to update group metadata", "groupID", realGroupID, "error", err)
		}
	}

	slog.Info("assigned groups", "groups", len(groupIDMap), "photos", len(photos))
	return nil
}

func detectGroupAssignments(photos []Photo) map[int]int64 {
	assignments := make(map[int]int64)
	if len(photos) == 0 {
		return assignments
	}

	var currentGroupID int64 = 1
	var groupStartLat *float64
	var groupStartLon *float64
	var lastPhotoTime *time.Time
	var groupStartTime *time.Time

	for i, photo := range photos {
		photoTime := parsePhotoDateTime(photo)
		if photoTime == nil {
			continue
		}

		if lastPhotoTime == nil {
			assignments[i] = currentGroupID
			lastPhotoTime = photoTime
			groupStartTime = photoTime

			if photo.Latitude != nil && photo.Longitude != nil {
				groupStartLat = photo.Latitude
				groupStartLon = photo.Longitude
			}
			continue
		}

		timeSinceLastPhoto := math.Abs(photoTime.Sub(*lastPhotoTime).Minutes())
		groupDuration := math.Abs(photoTime.Sub(*groupStartTime).Hours())
		shouldSplit := false

		if timeSinceLastPhoto > TimeGapThresholdMinutes {
			shouldSplit = true
		}

		if !shouldSplit && groupDuration > MaxGroupDurationHours {
			shouldSplit = true
		}

		if !shouldSplit && groupStartLat != nil && groupStartLon != nil {
			if photo.Latitude != nil && photo.Longitude != nil {
				distance := haversineDistance(*groupStartLat, *groupStartLon, *photo.Latitude, *photo.Longitude)
				if distance > LocationRadiusKm {
					shouldSplit = true
				}
			}
		}

		if shouldSplit {
			currentGroupID++
			groupStartTime = photoTime
			if photo.Latitude != nil && photo.Longitude != nil {
				groupStartLat = photo.Latitude
				groupStartLon = photo.Longitude
			} else {
				groupStartLat = nil
				groupStartLon = nil
			}
		}

		assignments[i] = currentGroupID
		lastPhotoTime = photoTime
	}

	return assignments
}

func updatePhotoGroupID(filePath string, groupID int64) error {
	query := `UPDATE photos SET group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE file_path = ?`
	_, err := sqlite.DB.Exec(query, groupID, filePath)
	return err
}

func parsePhotoDateTime(photo Photo) *time.Time {
	if photo.DateTime != nil {
		return parseDateTimeString(*photo.DateTime)
	}
	if photo.FileModifiedAt != nil {
		return parseDateTimeString(*photo.FileModifiedAt)
	}
	return parseDateTimeString(photo.CreatedAt)
}

func parseDateTimeString(dtStr string) *time.Time {
	return utils.ParseDateTime(dtStr)
}

func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0

	dLat := degreesToRadians(lat2 - lat1)
	dLon := degreesToRadians(lon2 - lon1)

	lat1Rad := degreesToRadians(lat1)
	lat2Rad := degreesToRadians(lat2)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Sin(dLon/2)*math.Sin(dLon/2)*math.Cos(lat1Rad)*math.Cos(lat2Rad)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusKm * c
}

func degreesToRadians(degrees float64) float64 {
	return degrees * math.Pi / 180
}

func formatGroupLocation(city, state, countryName *string) *string {
	if city == nil && state == nil && countryName == nil {
		return nil
	}

	var parts []string
	if city != nil && *city != "" {
		parts = append(parts, *city)
	}
	if state != nil && *state != "" {
		parts = append(parts, *state)
	}
	if countryName != nil && *countryName != "" {
		parts = append(parts, *countryName)
	}

	if len(parts) == 0 {
		return nil
	}

	location := parts[0]
	if len(parts) > 1 {
		location = parts[0] + ", " + parts[len(parts)-1]
	}
	return &location
}

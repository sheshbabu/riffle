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

func AssignGroupToPhoto(photoTime time.Time, fileSize int64, lat, lon *float64, city, state, countryCode *string) (int64, error) {
	adjacent, err := GetAdjacentPhotos(photoTime)
	if err != nil {
		slog.Error("failed to get adjacent photos", "error", err)
	}

	if adjacent.Before != nil && adjacent.Before.GroupID != nil {
		beforeGroup, err := GetGroupByID(*adjacent.Before.GroupID)
		if err == nil && canJoinGroup(photoTime, lat, lon, beforeGroup, adjacent.Before) {
			return *adjacent.Before.GroupID, nil
		}
	}

	if adjacent.After != nil && adjacent.After.GroupID != nil {
		afterGroup, err := GetGroupByID(*adjacent.After.GroupID)
		if err == nil && canJoinGroup(photoTime, lat, lon, afterGroup, adjacent.After) {
			return *adjacent.After.GroupID, nil
		}
	}

	groupID, err := CreateGroup(photoTime, photoTime, lat, lon, city, state, countryCode)
	if err != nil {
		return 0, fmt.Errorf("failed to create group: %w", err)
	}
	return groupID, nil
}

func canJoinGroup(photoTime time.Time, lat, lon *float64, group *GroupRecord, adjacentPhoto *Photo) bool {
	if adjacentPhoto == nil {
		return false
	}

	adjacentTime := parsePhotoDateTime(*adjacentPhoto)
	if adjacentTime == nil {
		return false
	}

	timeDiff := math.Abs(photoTime.Sub(*adjacentTime).Minutes())
	if timeDiff > TimeGapThresholdMinutes {
		return false
	}

	newStartTime := group.StartTime
	newEndTime := group.EndTime
	if photoTime.Before(newStartTime) {
		newStartTime = photoTime
	}
	if photoTime.After(newEndTime) {
		newEndTime = photoTime
	}
	if newEndTime.Sub(newStartTime).Hours() > MaxGroupDurationHours {
		return false
	}

	if group.Latitude != nil && group.Longitude != nil && lat != nil && lon != nil {
		distance := haversineDistance(*group.Latitude, *group.Longitude, *lat, *lon)
		if distance > LocationRadiusKm {
			return false
		}
	}

	return true
}

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

	query := fmt.Sprintf(`
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
		%s
		ORDER BY date_time DESC, created_at DESC
		LIMIT ? OFFSET ?
	`, whereClause)

	args := append(filterArgs, limit, offset)
	rows, err := sqlite.DB.Query(query, args...)
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

		if p.GroupID != nil {
			groupPhotoCount[*p.GroupID]++
			groupTotalSize[*p.GroupID] += p.FileSize
		}
	}

	var groups []Group
	if len(groupPhotoCount) > 0 {
		groupIDs := make([]int64, 0, len(groupPhotoCount))
		for id := range groupPhotoCount {
			groupIDs = append(groupIDs, id)
		}

		groupRecords, err := GetGroupsByIDs(groupIDs)
		if err != nil {
			slog.Error("failed to get groups by ids", "error", err)
		} else {
			for _, gr := range groupRecords {
				location := formatGroupLocation(gr.City, gr.State, gr.CountryCode)
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

	if len(groups) == 0 && len(photos) > 0 {
		groups = detectGroupsFromPhotos(photos)
	}

	return photos, groups, nil
}

func detectGroupsFromPhotos(photos []Photo) []Group {
	if len(photos) == 0 {
		return []Group{}
	}

	var groups []Group
	var currentGroup *Group
	var groupStartLat *float64
	var groupStartLon *float64
	var lastPhotoTime *time.Time

	for i, photo := range photos {
		photoTime := parsePhotoDateTime(photo)
		if photoTime == nil {
			continue
		}

		if currentGroup == nil {
			currentGroup = &Group{
				GroupID:    int64(len(groups) + 1),
				StartTime:  *photoTime,
				EndTime:    *photoTime,
				PhotoCount: 1,
				TotalSize:  photo.FileSize,
				Location:   formatPhotoLocation(photo),
			}
			lastPhotoTime = photoTime

			if photo.Latitude != nil && photo.Longitude != nil {
				lat := parseFloat(photo.Latitude)
				lon := parseFloat(photo.Longitude)
				groupStartLat = &lat
				groupStartLon = &lon
				currentGroup.Latitude = &lat
				currentGroup.Longitude = &lon
			}
			continue
		}

		timeSinceLastPhoto := math.Abs(photoTime.Sub(*lastPhotoTime).Minutes())
		groupDuration := math.Abs(photoTime.Sub(currentGroup.StartTime).Hours())
		shouldSplit := false

		if timeSinceLastPhoto > TimeGapThresholdMinutes {
			shouldSplit = true
		}

		if !shouldSplit && groupDuration > MaxGroupDurationHours {
			shouldSplit = true
		}

		if !shouldSplit && groupStartLat != nil && groupStartLon != nil {
			if photo.Latitude != nil && photo.Longitude != nil {
				photoLat := parseFloat(photo.Latitude)
				photoLon := parseFloat(photo.Longitude)
				distance := haversineDistance(*groupStartLat, *groupStartLon, photoLat, photoLon)
				if distance > LocationRadiusKm {
					shouldSplit = true
				}
			}
		}

		if shouldSplit {
			groups = append(groups, *currentGroup)
			currentGroup = &Group{
				GroupID:    int64(len(groups) + 1),
				StartTime:  *photoTime,
				EndTime:    *photoTime,
				PhotoCount: 1,
				TotalSize:  photo.FileSize,
				Location:   formatPhotoLocation(photo),
			}
			lastPhotoTime = photoTime

			if photo.Latitude != nil && photo.Longitude != nil {
				lat := parseFloat(photo.Latitude)
				lon := parseFloat(photo.Longitude)
				groupStartLat = &lat
				groupStartLon = &lon
				currentGroup.Latitude = &lat
				currentGroup.Longitude = &lon
			} else {
				groupStartLat = nil
				groupStartLon = nil
			}
		} else {
			if photoTime.Before(currentGroup.StartTime) {
				currentGroup.StartTime = *photoTime
			}
			if photoTime.After(currentGroup.EndTime) {
				currentGroup.EndTime = *photoTime
			}
			currentGroup.PhotoCount++
			currentGroup.TotalSize += photo.FileSize
			lastPhotoTime = photoTime

			if groupStartLat != nil && photo.Latitude != nil && photo.Longitude != nil {
				avgLat := (*currentGroup.Latitude + parseFloat(photo.Latitude)) / 2
				avgLon := (*currentGroup.Longitude + parseFloat(photo.Longitude)) / 2
				currentGroup.Latitude = &avgLat
				currentGroup.Longitude = &avgLon
			}
		}

		if i == len(photos)-1 && currentGroup != nil {
			groups = append(groups, *currentGroup)
		}
	}

	if currentGroup != nil && len(groups) == 0 {
		groups = append(groups, *currentGroup)
	}

	return groups
}

func AssignGroupsToUngroupedPhotos() error {
	query := `
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
				photo.City, photo.State, photo.CountryCode)
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
				lat := parseFloat(photo.Latitude)
				lon := parseFloat(photo.Longitude)
				groupStartLat = &lat
				groupStartLon = &lon
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
				photoLat := parseFloat(photo.Latitude)
				photoLon := parseFloat(photo.Longitude)
				distance := haversineDistance(*groupStartLat, *groupStartLon, photoLat, photoLon)
				if distance > LocationRadiusKm {
					shouldSplit = true
				}
			}
		}

		if shouldSplit {
			currentGroupID++
			groupStartTime = photoTime
			if photo.Latitude != nil && photo.Longitude != nil {
				lat := parseFloat(photo.Latitude)
				lon := parseFloat(photo.Longitude)
				groupStartLat = &lat
				groupStartLon = &lon
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

func ParsePhotoDateTimeValue(photo Photo) *time.Time {
	return parsePhotoDateTime(photo)
}

func ParsePhotoLocation(photo Photo) (*float64, *float64) {
	if photo.Latitude == nil || photo.Longitude == nil {
		return nil, nil
	}
	lat := utils.ParseDMSOrDecimal(*photo.Latitude)
	lon := utils.ParseDMSOrDecimal(*photo.Longitude)
	if lat == 0 && lon == 0 {
		return nil, nil
	}
	return &lat, &lon
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

func parseFloat(s *string) float64 {
	if s == nil {
		return 0
	}
	var f float64
	fmt.Sscanf(*s, "%f", &f)
	return f
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

func formatPhotoLocation(photo Photo) *string {
	return formatGroupLocation(photo.City, photo.State, photo.CountryCode)
}

func formatGroupLocation(city, state, countryCode *string) *string {
	if city == nil && state == nil && countryCode == nil {
		return nil
	}

	var parts []string
	if city != nil && *city != "" {
		parts = append(parts, *city)
	}
	if state != nil && *state != "" {
		parts = append(parts, *state)
	}
	if countryCode != nil && *countryCode != "" {
		parts = append(parts, *countryCode)
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

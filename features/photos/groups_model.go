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
	CountryName *string   `json:"countryName,omitempty"`
	CreatedAt   string    `json:"createdAt"`
	UpdatedAt   string    `json:"updatedAt"`
}

func CreateGroup(startTime, endTime time.Time, lat, lon *float64, city, state, countryName *string) (int64, error) {
	query := `
		INSERT INTO photo_groups (start_time, end_time, photo_count, total_size, latitude, longitude, city, state, country_name)
		VALUES (?, ?, 0, 0, ?, ?, ?, ?, ?)
	`
	result, err := sqlite.DB.Exec(query, startTime, endTime, lat, lon, city, state, countryName)
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
		       latitude, longitude, city, state, country_name,
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
			&g.Latitude, &g.Longitude, &g.City, &g.State, &g.CountryName,
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
		    max_date_time = (SELECT MAX(date_time) FROM photos WHERE group_id = ?),
		    updated_at = CURRENT_TIMESTAMP
		WHERE group_id = ?
	`
	_, err := sqlite.DB.Exec(query, groupID, groupID, groupID, groupID, groupID, groupID)
	if err != nil {
		err = fmt.Errorf("error updating group metadata: %w", err)
		slog.Error(err.Error())
		return err
	}
	return nil
}

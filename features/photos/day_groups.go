package photos

import (
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
)

type Group struct {
	Date       string `json:"date"`
	PhotoCount int    `json:"photoCount"`
	TotalSize  int64  `json:"totalSize"`
}

func GetPhotosWithDayGroups(limit, offset int, isCurated, isTrashed bool, filters *PhotoFilters) ([]Photo, []Group, int, int, int, error) {
	whereClause := "WHERE 1=1"
	args := []any{}

	if isCurated {
		whereClause += " AND is_curated = 1 AND is_trashed = 0"
	} else {
		whereClause += " AND is_curated = 0 AND is_trashed = 0"
	}

	if isTrashed {
		whereClause = "WHERE is_trashed = 1"
	}

	if filters != nil {
		filterSQL, filterArgs := BuildFilterConditions(filters)
		if filterSQL != "" {
			whereClause += filterSQL
			args = append(args, filterArgs...)
		}
	}

	totalRecords := getCount(whereClause, args...)

	groups, err := getGroupsForPage(whereClause, args, limit, offset)
	if err != nil {
		return nil, nil, 0, 0, 0, err
	}

	photoQuery := fmt.Sprintf(`
		SELECT
			file_path, original_filepath, sha256_hash, dhash, file_size,
			date_time, camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration,
			file_created_at, file_modified_at,
			city, state, country_name,
			is_curated, is_trashed, rating, notes,
			created_at, updated_at, thumbnail_path
		FROM
			photos
		%s
		ORDER BY
			date_time DESC,
			created_at DESC
		LIMIT
			?
		OFFSET
			?
	`, whereClause)

	photoArgs := append([]any{}, args...)
	photoArgs = append(photoArgs, limit, offset)

	rows, err := sqlite.DB.Query(photoQuery, photoArgs...)
	if err != nil {
		err = fmt.Errorf("error querying photos: %w", err)
		slog.Error(err.Error())
		return nil, nil, 0, 0, 0, err
	}
	defer rows.Close()

	photos := []Photo{}
	for rows.Next() {
		var p Photo
		err := rows.Scan(
			&p.FilePath, &p.OriginalFilepath, &p.Sha256Hash, &p.Dhash, &p.FileSize,
			&p.DateTime, &p.CameraMake, &p.CameraModel, &p.Width, &p.Height, &p.Orientation,
			&p.Latitude, &p.Longitude, &p.ISO, &p.FNumber, &p.ExposureTime, &p.FocalLength,
			&p.FileFormat, &p.MimeType, &p.IsVideo, &p.Duration,
			&p.FileCreatedAt, &p.FileModifiedAt,
			&p.City, &p.State, &p.CountryName,
			&p.IsCurated, &p.IsTrashed, &p.Rating, &p.Notes,
			&p.CreatedAt, &p.UpdatedAt, &p.ThumbnailPath,
		)
		if err != nil {
			err = fmt.Errorf("error scanning photo: %w", err)
			slog.Error(err.Error())
			return nil, nil, 0, 0, 0, err
		}
		photos = append(photos, p)
	}

	if err = rows.Err(); err != nil {
		err = fmt.Errorf("error iterating photos: %w", err)
		slog.Error(err.Error())
		return nil, nil, 0, 0, 0, err
	}

	pageStartRecord := offset + 1
	pageEndRecord := offset + len(photos)
	if pageEndRecord > totalRecords {
		pageEndRecord = totalRecords
	}
	if totalRecords == 0 {
		pageStartRecord = 0
		pageEndRecord = 0
	}

	return photos, groups, totalRecords, pageStartRecord, pageEndRecord, nil
}

func getGroupsForPage(whereClause string, args []any, limit, offset int) ([]Group, error) {
	query := fmt.Sprintf(`
		SELECT
			COALESCE(SUBSTR(date_time, 1, 10), 'Unknown') as day_date,
			COUNT(*) as photo_count,
			SUM(file_size) as total_size
		FROM (
			SELECT
				date_time, file_size
			FROM
				photos
			%s
			ORDER BY
				date_time DESC,
				created_at DESC
			LIMIT
				?
			OFFSET
				?
		)
		GROUP BY
			day_date
		ORDER BY
			day_date DESC
	`, whereClause)

	groupArgs := append([]any{}, args...)
	groupArgs = append(groupArgs, limit, offset)

	rows, err := sqlite.DB.Query(query, groupArgs...)
	if err != nil {
		err = fmt.Errorf("error querying groups: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	groups := []Group{}
	for rows.Next() {
		var g Group
		err := rows.Scan(&g.Date, &g.PhotoCount, &g.TotalSize)
		if err != nil {
			err = fmt.Errorf("error scanning group: %w", err)
			slog.Error(err.Error())
			return nil, err
		}
		groups = append(groups, g)
	}

	if err = rows.Err(); err != nil {
		err = fmt.Errorf("error iterating groups: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return groups, nil
}

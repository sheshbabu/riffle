package photos

import (
	"fmt"
	"log/slog"
	"math"
	"riffle/commons/sqlite"
	"time"
)

type Session struct {
	SessionID   string    `json:"sessionId"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	PhotoCount  int       `json:"photoCount"`
	Location    *string   `json:"location,omitempty"`
	Latitude    *float64  `json:"latitude,omitempty"`
	Longitude   *float64  `json:"longitude,omitempty"`
}

const (
	TimeGapThresholdMinutes = 120
	LocationRadiusKm        = 1.0
	MaxSessionDurationHours = 12
)

func DetectSessions(photos []Photo) []Session {
	if len(photos) == 0 {
		return []Session{}
	}

	var sessions []Session
	var currentSession *Session
	var sessionStartLat *float64
	var sessionStartLon *float64
	var lastPhotoTime *time.Time

	for i, photo := range photos {
		photoTime := parsePhotoDateTime(photo)
		if photoTime == nil {
			continue
		}

		if currentSession == nil {
			currentSession = &Session{
				SessionID:  fmt.Sprintf("session-%d", len(sessions)+1),
				StartTime:  *photoTime,
				EndTime:    *photoTime,
				PhotoCount: 1,
			}
			lastPhotoTime = photoTime

			if photo.Latitude != nil && photo.Longitude != nil {
				lat := parseFloat(photo.Latitude)
				lon := parseFloat(photo.Longitude)
				sessionStartLat = &lat
				sessionStartLon = &lon
				currentSession.Latitude = &lat
				currentSession.Longitude = &lon
			}
			continue
		}

		timeSinceLastPhoto := math.Abs(photoTime.Sub(*lastPhotoTime).Minutes())
		sessionDuration := math.Abs(photoTime.Sub(currentSession.StartTime).Hours())
		shouldSplit := false

		if timeSinceLastPhoto > TimeGapThresholdMinutes {
			shouldSplit = true
		}

		if !shouldSplit && sessionDuration > MaxSessionDurationHours {
			shouldSplit = true
		}

		if !shouldSplit && sessionStartLat != nil && sessionStartLon != nil {
			if photo.Latitude != nil && photo.Longitude != nil {
				photoLat := parseFloat(photo.Latitude)
				photoLon := parseFloat(photo.Longitude)
				distance := haversineDistance(*sessionStartLat, *sessionStartLon, photoLat, photoLon)
				if distance > LocationRadiusKm {
					shouldSplit = true
				}
			}
		}

		if shouldSplit {
			sessions = append(sessions, *currentSession)
			currentSession = &Session{
				SessionID:  fmt.Sprintf("session-%d", len(sessions)+1),
				StartTime:  *photoTime,
				EndTime:    *photoTime,
				PhotoCount: 1,
			}
			lastPhotoTime = photoTime

			if photo.Latitude != nil && photo.Longitude != nil {
				lat := parseFloat(photo.Latitude)
				lon := parseFloat(photo.Longitude)
				sessionStartLat = &lat
				sessionStartLon = &lon
				currentSession.Latitude = &lat
				currentSession.Longitude = &lon
			} else {
				sessionStartLat = nil
				sessionStartLon = nil
			}
		} else {
			if photoTime.Before(currentSession.StartTime) {
				currentSession.StartTime = *photoTime
			}
			if photoTime.After(currentSession.EndTime) {
				currentSession.EndTime = *photoTime
			}
			currentSession.PhotoCount++
			lastPhotoTime = photoTime

			if sessionStartLat != nil && photo.Latitude != nil && photo.Longitude != nil {
				avgLat := (*currentSession.Latitude + parseFloat(photo.Latitude)) / 2
				avgLon := (*currentSession.Longitude + parseFloat(photo.Longitude)) / 2
				currentSession.Latitude = &avgLat
				currentSession.Longitude = &avgLon
			}
		}

		if i == len(photos)-1 && currentSession != nil {
			sessions = append(sessions, *currentSession)
		}
	}

	if currentSession != nil && len(sessions) == 0 {
		sessions = append(sessions, *currentSession)
	}

	return sessions
}

func GetPhotosWithSessions(limit, offset int, filterCurated bool, filterTrashed bool) ([]Photo, []Session, error) {
	var whereClause string
	if filterCurated && !filterTrashed {
		whereClause = "WHERE is_curated = 1 AND is_trashed = 0"
	} else if !filterCurated && !filterTrashed {
		whereClause = "WHERE is_curated = 0"
	} else if filterTrashed {
		whereClause = "WHERE is_trashed = 1"
	}

	query := fmt.Sprintf(`
		SELECT
			file_path, sha256_hash, dhash, file_size, date_time,
			camera_make, camera_model, width, height, orientation,
			latitude, longitude, iso, f_number, exposure_time, focal_length,
			file_format, mime_type, is_video, duration,
			file_created_at, file_modified_at,
			is_curated, is_trashed, rating, notes,
			created_at, updated_at,
			COUNT(*) OVER() AS total_records
		FROM photos
		%s
		ORDER BY
			COALESCE(date_time, file_modified_at, created_at) DESC,
			created_at DESC
		LIMIT ? OFFSET ?
	`, whereClause)

	rows, err := sqlite.DB.Query(query, limit, offset)
	if err != nil {
		err = fmt.Errorf("error querying photos with sessions: %w", err)
		slog.Error(err.Error())
		return nil, nil, err
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
			&p.IsCurated, &p.IsTrashed, &p.Rating, &p.Notes,
			&p.CreatedAt, &p.UpdatedAt,
			&p.TotalRecords,
		)
		if err != nil {
			err = fmt.Errorf("error scanning photo row: %w", err)
			slog.Error(err.Error())
			continue
		}
		photos = append(photos, p)
	}

	sessions := DetectSessions(photos)

	return photos, sessions, nil
}

func parsePhotoDateTime(photo Photo) *time.Time {
	if photo.DateTime != nil {
		t, err := time.Parse(time.RFC3339, *photo.DateTime)
		if err == nil {
			return &t
		}
	}

	if photo.FileModifiedAt != nil {
		t, err := time.Parse(time.RFC3339, *photo.FileModifiedAt)
		if err == nil {
			return &t
		}
	}

	t, err := time.Parse(time.RFC3339, photo.CreatedAt)
	if err == nil {
		return &t
	}

	return nil
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

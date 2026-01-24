package export

import (
	"database/sql"
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"time"
)

type ExportSession struct {
	ExportID        int64
	ExportPath      string
	MinRating       int
	CurationStatus  sql.NullString
	StartedAt       time.Time
	CompletedAt     sql.NullTime
	DurationSeconds sql.NullInt64
	TotalPhotos     int
	ExportedPhotos  int
	ErrorCount      int
	ErrorMessage    sql.NullString
	Status          string
	CreatedAt       time.Time
}

func CreateExportSession(exportPath string, criteria ExportCriteria) (int64, error) {
	query := `
		INSERT INTO export_sessions (export_path, min_rating, curation_status, started_at, status)
		VALUES (?, ?, ?, ?, ?)
	`

	result, err := sqlite.DB.Exec(
		query,
		exportPath,
		criteria.MinRating,
		sql.NullString{String: string(criteria.CurationStatus), Valid: criteria.CurationStatus != ""},
		time.Now(),
		"collecting",
	)
	if err != nil {
		err = fmt.Errorf("error creating export session: %w", err)
		slog.Error(err.Error())
		return 0, err
	}

	exportID, err := result.LastInsertId()
	if err != nil {
		err = fmt.Errorf("error getting export session ID: %w", err)
		slog.Error(err.Error())
		return 0, err
	}

	return exportID, nil
}

func UpdateExportSessionStatus(exportID int64, status string) error {
	query := `UPDATE export_sessions SET status = ? WHERE export_id = ?`

	_, err := sqlite.DB.Exec(query, status, exportID)
	if err != nil {
		err = fmt.Errorf("error updating export session status: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func UpdateExportSessionStats(exportID int64, totalPhotos int) error {
	query := `UPDATE export_sessions SET total_photos = ? WHERE export_id = ?`

	_, err := sqlite.DB.Exec(query, totalPhotos, exportID)
	if err != nil {
		err = fmt.Errorf("error updating export session stats: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func IncrementExportedPhotos(exportID int64) error {
	query := `UPDATE export_sessions SET exported_photos = exported_photos + 1 WHERE export_id = ?`

	_, err := sqlite.DB.Exec(query, exportID)
	if err != nil {
		err = fmt.Errorf("error incrementing exported photos: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func IncrementExportErrors(exportID int64) error {
	query := `UPDATE export_sessions SET error_count = error_count + 1 WHERE export_id = ?`

	_, err := sqlite.DB.Exec(query, exportID)
	if err != nil {
		err = fmt.Errorf("error incrementing export errors: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func CompleteExportSession(exportID int64, startedAt time.Time, result *ExportResult, errorMsg string) error {
	completedAt := time.Now()
	duration := int(completedAt.Sub(startedAt).Seconds())
	status := "completed"

	if errorMsg != "" {
		status = "error"
	}

	query := `
		UPDATE export_sessions
		SET completed_at = ?,
		    duration_seconds = ?,
		    error_message = ?,
		    status = ?
		WHERE export_id = ?
	`

	_, err := sqlite.DB.Exec(
		query,
		completedAt,
		duration,
		sql.NullString{String: errorMsg, Valid: errorMsg != ""},
		status,
		exportID,
	)
	if err != nil {
		err = fmt.Errorf("error completing export session: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func RecordExportedPhoto(exportID int64, filePath, status, errorMessage string) error {
	query := `
		INSERT INTO exported_photos (export_id, file_path, status, error_message, exported_at)
		VALUES (?, ?, ?, ?, ?)
	`

	_, err := sqlite.DB.Exec(
		query,
		exportID,
		filePath,
		status,
		sql.NullString{String: errorMessage, Valid: errorMessage != ""},
		time.Now(),
	)
	if err != nil {
		err = fmt.Errorf("error recording exported photo: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func GetExportSessions(limit int) ([]ExportSession, error) {
	query := `
		SELECT export_id, export_path, min_rating, curation_status, started_at,
		       completed_at, duration_seconds, total_photos, exported_photos,
		       error_count, error_message, status, created_at
		FROM export_sessions
		ORDER BY started_at DESC
		LIMIT ?
	`

	rows, err := sqlite.DB.Query(query, limit)
	if err != nil {
		err = fmt.Errorf("error querying export sessions: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var sessions []ExportSession
	for rows.Next() {
		var session ExportSession
		err := rows.Scan(
			&session.ExportID,
			&session.ExportPath,
			&session.MinRating,
			&session.CurationStatus,
			&session.StartedAt,
			&session.CompletedAt,
			&session.DurationSeconds,
			&session.TotalPhotos,
			&session.ExportedPhotos,
			&session.ErrorCount,
			&session.ErrorMessage,
			&session.Status,
			&session.CreatedAt,
		)
		if err != nil {
			slog.Error("error scanning export session row", "error", err)
			continue
		}
		sessions = append(sessions, session)
	}

	return sessions, nil
}

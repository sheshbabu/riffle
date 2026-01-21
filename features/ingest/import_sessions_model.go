package ingest

import (
	"database/sql"
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"time"
)

type ImportSession struct {
	ImportID          int64
	ImportPath        string
	ImportMode        string
	StartedAt         time.Time
	CompletedAt       sql.NullTime
	DurationSeconds   sql.NullInt64
	TotalScanned      int
	AlreadyImported   int
	UniqueFiles       int
	DuplicateGroups   int
	DuplicatesRemoved int
	MovedToLibrary    int
	ErrorCount        int
	ErrorMessage      sql.NullString
	Status            string
	CreatedAt         time.Time
}

func CreateImportSession(importPath, importMode string) (int64, error) {
	query := `
		INSERT INTO import_sessions (import_path, import_mode, started_at, status)
		VALUES (?, ?, ?, ?)
	`

	result, err := sqlite.DB.Exec(query, importPath, importMode, time.Now(), "scanning")
	if err != nil {
		err = fmt.Errorf("error creating import session: %w", err)
		slog.Error(err.Error())
		return 0, err
	}

	importID, err := result.LastInsertId()
	if err != nil {
		err = fmt.Errorf("error getting import session ID: %w", err)
		slog.Error(err.Error())
		return 0, err
	}

	return importID, nil
}

func UpdateImportSessionStatus(importID int64, status string) error {
	query := `UPDATE import_sessions SET status = ? WHERE import_id = ?`

	_, err := sqlite.DB.Exec(query, status, importID)
	if err != nil {
		err = fmt.Errorf("error updating import session status: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func UpdateImportSessionStats(importID int64, stats *AnalysisStats) error {
	query := `
		UPDATE import_sessions
		SET total_scanned = ?,
		    already_imported = ?,
		    unique_files = ?,
		    duplicate_groups = ?,
		    duplicates_removed = ?
		WHERE import_id = ?
	`

	_, err := sqlite.DB.Exec(
		query,
		stats.TotalScanned,
		stats.AlreadyImported,
		stats.UniqueFiles,
		stats.DuplicateGroups,
		stats.DuplicatesRemoved,
		importID,
	)
	if err != nil {
		err = fmt.Errorf("error updating import session stats: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func CompleteImportSession(importID int64, stats *AnalysisStats, startedAt time.Time, errorMsg string) error {
	completedAt := time.Now()
	duration := int(completedAt.Sub(startedAt).Seconds())
	status := "completed"
	var errorCount int

	if errorMsg != "" {
		status = "error"
		errorCount = 1
	}

	query := `
		UPDATE import_sessions
		SET completed_at = ?,
		    duration_seconds = ?,
		    moved_to_library = ?,
		    error_count = ?,
		    error_message = ?,
		    status = ?
		WHERE import_id = ?
	`

	_, err := sqlite.DB.Exec(
		query,
		completedAt,
		duration,
		stats.MovedToLibrary,
		errorCount,
		sql.NullString{String: errorMsg, Valid: errorMsg != ""},
		status,
		importID,
	)
	if err != nil {
		err = fmt.Errorf("error completing import session: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func RecordImportedPhoto(importID int64, filePath, status, errorMessage string) error {
	query := `
		INSERT INTO imported_photos (import_id, file_path, status, error_message, imported_at)
		VALUES (?, ?, ?, ?, ?)
	`

	_, err := sqlite.DB.Exec(
		query,
		importID,
		filePath,
		status,
		sql.NullString{String: errorMessage, Valid: errorMessage != ""},
		time.Now(),
	)
	if err != nil {
		err = fmt.Errorf("error recording imported photo: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func IncrementImportErrors(importID int64) error {
	query := `UPDATE import_sessions SET error_count = error_count + 1 WHERE import_id = ?`

	_, err := sqlite.DB.Exec(query, importID)
	if err != nil {
		err = fmt.Errorf("error incrementing import errors: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func GetImportSessions(limit int) ([]ImportSession, error) {
	query := `
		SELECT import_id, import_path, import_mode, started_at, completed_at,
		       duration_seconds, total_scanned, already_imported, unique_files,
		       duplicate_groups, duplicates_removed, moved_to_library,
		       error_count, error_message, status, created_at
		FROM import_sessions
		ORDER BY started_at DESC
		LIMIT ?
	`

	rows, err := sqlite.DB.Query(query, limit)
	if err != nil {
		err = fmt.Errorf("error querying import sessions: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	var sessions []ImportSession
	for rows.Next() {
		var session ImportSession
		err := rows.Scan(
			&session.ImportID,
			&session.ImportPath,
			&session.ImportMode,
			&session.StartedAt,
			&session.CompletedAt,
			&session.DurationSeconds,
			&session.TotalScanned,
			&session.AlreadyImported,
			&session.UniqueFiles,
			&session.DuplicateGroups,
			&session.DuplicatesRemoved,
			&session.MovedToLibrary,
			&session.ErrorCount,
			&session.ErrorMessage,
			&session.Status,
			&session.CreatedAt,
		)
		if err != nil {
			slog.Error("error scanning import session row", "error", err)
			continue
		}
		sessions = append(sessions, session)
	}

	return sessions, nil
}

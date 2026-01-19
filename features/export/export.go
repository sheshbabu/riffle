package export

import (
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"riffle/commons/sqlite"
)

type ExportCriteria struct {
	MinRating       int
	CurationStatus  string // "all", "pick"
}

type ExportResult struct {
	TotalPhotos    int `json:"totalPhotos"`
	ExportedPhotos int `json:"exportedPhotos"`
	ErrorCount     int `json:"errorCount"`
}

func StartExport(exportPath string, criteria ExportCriteria) {
	go func() {
		result, err := ProcessExport(exportPath, criteria)
		if err != nil {
			slog.Error("export failed", "error", err)
			UpdateProgress(StatusExportError, 0, 0, err.Error())
			return
		}
		message := fmt.Sprintf("Exported %d photos", result.ExportedPhotos)
		UpdateProgress(StatusExportComplete, result.ExportedPhotos, result.TotalPhotos, message)
		slog.Info("export completed", "result", result)
	}()
}

func ProcessExport(exportPath string, criteria ExportCriteria) (*ExportResult, error) {
	UpdateProgress(StatusCollecting, 0, 0, "Collecting photos to export")

	photos, err := getPhotosForExport(criteria)
	if err != nil {
		return nil, fmt.Errorf("failed to get photos for export: %w", err)
	}

	result := &ExportResult{
		TotalPhotos: len(photos),
	}

	if len(photos) == 0 {
		UpdateProgress(StatusExportComplete, 0, 0, "No photos match export criteria")
		return result, nil
	}

	slog.Info("starting export", "totalPhotos", len(photos), "criteria", criteria)

	for i, photo := range photos {
		UpdateProgress(StatusExporting, i, len(photos), fmt.Sprintf("Exporting %d/%d", i+1, len(photos)))

		if err := exportPhoto(photo, exportPath); err != nil {
			slog.Error("error exporting photo", "error", err, "path", photo.FilePath)
			result.ErrorCount++
			continue
		}

		result.ExportedPhotos++
	}

	return result, nil
}

type PhotoToExport struct {
	FilePath   string
	DateTime   sql.NullTime
}

func getPhotosForExport(criteria ExportCriteria) ([]PhotoToExport, error) {
	query := `
		SELECT file_path, date_time
		FROM photos
		WHERE 1=1
	`
	args := []any{}

	if criteria.MinRating > 0 {
		query += ` AND rating >= ?`
		args = append(args, criteria.MinRating)
	}

	switch criteria.CurationStatus {
	case "pick":
		query += ` AND is_curated = 1 AND is_trashed = 0`
	}

	query += ` ORDER BY date_time ASC`

	rows, err := sqlite.DB.Query(query, args...)
	if err != nil {
		err = fmt.Errorf("error querying photos for export: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	photos := []PhotoToExport{}
	for rows.Next() {
		var photo PhotoToExport
		if err := rows.Scan(&photo.FilePath, &photo.DateTime); err != nil {
			slog.Error("error scanning photo row", "error", err)
			continue
		}
		photos = append(photos, photo)
	}

	return photos, nil
}

func exportPhoto(photo PhotoToExport, exportPath string) error {
	destPath := filepath.Join(exportPath, filepath.Base(photo.FilePath))

	sourceFile, err := os.Open(photo.FilePath)
	if err != nil {
		return fmt.Errorf("error opening source file: %w", err)
	}
	defer sourceFile.Close()

	destFile, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("error creating destination file: %w", err)
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, sourceFile); err != nil {
		return fmt.Errorf("error copying file: %w", err)
	}

	sourceInfo, err := os.Stat(photo.FilePath)
	if err != nil {
		slog.Warn("could not get source file info", "error", err)
		return nil
	}

	if err := os.Chtimes(destPath, sourceInfo.ModTime(), sourceInfo.ModTime()); err != nil {
		slog.Warn("could not preserve modification time", "error", err)
	}

	return nil
}

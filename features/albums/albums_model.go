package albums

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"time"
)

type Album struct {
	AlbumID     int       `json:"albumId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	PhotoCount  int       `json:"photoCount"`
	CoverPath   string    `json:"coverPath"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func GetAllAlbums() ([]Album, error) {
	query := `
		SELECT
			a.album_id,
			a.name,
			a.description,
			COUNT(ap.file_path) as photo_count,
			COALESCE(MIN(ap.file_path), '') as cover_path,
			a.created_at,
			a.updated_at
		FROM
			albums a
		LEFT JOIN
			album_photos ap ON a.album_id = ap.album_id
		GROUP BY
			a.album_id
		ORDER BY
			a.name ASC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("failed to get albums: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	albums := make([]Album, 0)
	for rows.Next() {
		var album Album
		err := rows.Scan(
			&album.AlbumID,
			&album.Name,
			&album.Description,
			&album.PhotoCount,
			&album.CoverPath,
			&album.CreatedAt,
			&album.UpdatedAt,
		)
		if err != nil {
			slog.Error("failed to scan album", "error", err)
			continue
		}
		albums = append(albums, album)
	}

	return albums, nil
}

func GetAlbumByID(albumID int) (*Album, error) {
	query := `
		SELECT
			a.album_id,
			a.name,
			a.description,
			COUNT(ap.file_path) as photo_count,
			COALESCE(MIN(ap.file_path), '') as cover_path,
			a.created_at,
			a.updated_at
		FROM
			albums a
		LEFT JOIN
			album_photos ap ON a.album_id = ap.album_id
		WHERE
			a.album_id = ?
		GROUP BY
			a.album_id
	`

	var album Album
	err := sqlite.DB.QueryRow(query, albumID).Scan(
		&album.AlbumID,
		&album.Name,
		&album.Description,
		&album.PhotoCount,
		&album.CoverPath,
		&album.CreatedAt,
		&album.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("album not found")
		}
		err = fmt.Errorf("failed to get album: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return &album, nil
}

func CreateAlbum(name, description string) (*Album, error) {
	query := `
		INSERT INTO
			albums (name, description)
		VALUES
			(?, ?)
	`

	result, err := sqlite.DB.Exec(query, name, description)
	if err != nil {
		err = fmt.Errorf("failed to create album: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	albumID, err := result.LastInsertId()
	if err != nil {
		err = fmt.Errorf("failed to get album id: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return GetAlbumByID(int(albumID))
}

func AddPhotosToAlbum(albumID int, filePaths []string) error {
	tx, err := sqlite.DB.Begin()
	if err != nil {
		err = fmt.Errorf("failed to begin transaction: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT OR IGNORE INTO
			album_photos (album_id, file_path)
		VALUES
			(?, ?)
	`

	stmt, err := tx.Prepare(query)
	if err != nil {
		err = fmt.Errorf("failed to prepare statement: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer stmt.Close()

	for _, filePath := range filePaths {
		_, err = stmt.Exec(albumID, filePath)
		if err != nil {
			err = fmt.Errorf("failed to add photo to album: %w", err)
			slog.Error(err.Error())
			return err
		}
	}

	updateQuery := `
		UPDATE
			albums
		SET
			updated_at = CURRENT_TIMESTAMP
		WHERE
			album_id = ?
	`

	_, err = tx.Exec(updateQuery, albumID)
	if err != nil {
		err = fmt.Errorf("failed to update album timestamp: %w", err)
		slog.Error(err.Error())
		return err
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("failed to commit transaction: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func RemovePhotosFromAlbum(albumID int, filePaths []string) error {
	tx, err := sqlite.DB.Begin()
	if err != nil {
		err = fmt.Errorf("failed to begin transaction: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer tx.Rollback()

	query := `
		DELETE FROM
			album_photos
		WHERE
			album_id = ? AND file_path = ?
	`

	stmt, err := tx.Prepare(query)
	if err != nil {
		err = fmt.Errorf("failed to prepare statement: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer stmt.Close()

	for _, filePath := range filePaths {
		_, err = stmt.Exec(albumID, filePath)
		if err != nil {
			err = fmt.Errorf("failed to remove photo from album: %w", err)
			slog.Error(err.Error())
			return err
		}
	}

	updateQuery := `
		UPDATE
			albums
		SET
			updated_at = CURRENT_TIMESTAMP
		WHERE
			album_id = ?
	`

	_, err = tx.Exec(updateQuery, albumID)
	if err != nil {
		err = fmt.Errorf("failed to update album timestamp: %w", err)
		slog.Error(err.Error())
		return err
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("failed to commit transaction: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func GetPhotoAlbums(filePath string) ([]int, error) {
	query := `
		SELECT
			album_id
		FROM
			album_photos
		WHERE
			file_path = ?
	`
	rows, err := sqlite.DB.Query(query, filePath)
	if err != nil {
		err = fmt.Errorf("failed to get photo albums: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	albumIDs := make([]int, 0)
	for rows.Next() {
		var albumID int
		if err := rows.Scan(&albumID); err != nil {
			slog.Error("failed to scan album id", "error", err)
			continue
		}
		albumIDs = append(albumIDs, albumID)
	}

	return albumIDs, nil
}

func GetAlbumPhotoPaths(albumID int) ([]string, error) {
	query := `
		SELECT
			file_path
		FROM
			album_photos
		WHERE
			album_id = ?
		ORDER BY
			created_at DESC
	`
	rows, err := sqlite.DB.Query(query, albumID)
	if err != nil {
		err = fmt.Errorf("failed to get album photos: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	filePaths := make([]string, 0)
	for rows.Next() {
		var filePath string
		if err := rows.Scan(&filePath); err != nil {
			slog.Error("failed to scan file path", "error", err)
			continue
		}
		filePaths = append(filePaths, filePath)
	}

	return filePaths, nil
}

func GetAlbumPhotosWithMetadata(albumID int) ([]map[string]interface{}, error) {
	query := `
		SELECT
			p.file_path,
			p.thumbnail_path,
			p.date_time,
			p.is_video,
			p.dhash,
			p.camera_make,
			p.camera_model,
			p.latitude,
			p.longitude,
			p.city,
			p.state,
			p.country_name,
			p.rating,
			p.is_curated,
			p.is_trashed,
			p.notes
		FROM
			photos p
		INNER JOIN
			album_photos ap ON p.file_path = ap.file_path
		WHERE
			ap.album_id = ?
		ORDER BY
			p.date_time DESC
	`

	rows, err := sqlite.DB.Query(query, albumID)
	if err != nil {
		err = fmt.Errorf("failed to get album photos with metadata: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	photos := make([]map[string]interface{}, 0)
	for rows.Next() {
		var filePath, thumbnailPath, dateTime string
		var isVideo, isCurated, isTrashed bool
		var dhash, cameraMake, cameraModel, latitude, longitude, city, state, country, notes sql.NullString
		var rating sql.NullInt64

		err := rows.Scan(
			&filePath,
			&thumbnailPath,
			&dateTime,
			&isVideo,
			&dhash,
			&cameraMake,
			&cameraModel,
			&latitude,
			&longitude,
			&city,
			&state,
			&country,
			&rating,
			&isCurated,
			&isTrashed,
			&notes,
		)
		if err != nil {
			slog.Error("failed to scan photo row", "error", err)
			continue
		}

		photo := map[string]interface{}{
			"filePath":      filePath,
			"thumbnailPath": thumbnailPath,
			"dateTime":      dateTime,
			"isVideo":       isVideo,
			"dhash":         dhash.String,
			"cameraMake":    cameraMake.String,
			"cameraModel":   cameraModel.String,
			"latitude":      latitude.String,
			"longitude":     longitude.String,
			"city":          city.String,
			"state":         state.String,
			"country":       country.String,
			"rating":        int(rating.Int64),
			"isCurated":     isCurated,
			"isTrashed":     isTrashed,
			"notes":         notes.String,
		}
		photos = append(photos, photo)
	}

	return photos, nil
}

type AlbumPhoto struct {
	FilePath     string `json:"filePath"`
	ThumbnailURL string `json:"thumbnailUrl"`
	DateTime     string `json:"dateTime"`
	IsVideo      bool   `json:"isVideo"`
}

func DeleteAlbum(albumID int) error {
	tx, err := sqlite.DB.Begin()
	if err != nil {
		err = fmt.Errorf("failed to begin transaction: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer tx.Rollback()

	deletePhotosQuery := `
		DELETE FROM
			album_photos
		WHERE
			album_id = ?
	`

	_, err = tx.Exec(deletePhotosQuery, albumID)
	if err != nil {
		err = fmt.Errorf("failed to delete album photos: %w", err)
		slog.Error(err.Error())
		return err
	}

	deleteAlbumQuery := `
		DELETE FROM
			albums
		WHERE
			album_id = ?
	`

	_, err = tx.Exec(deleteAlbumQuery, albumID)
	if err != nil {
		err = fmt.Errorf("failed to delete album: %w", err)
		slog.Error(err.Error())
		return err
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("failed to commit transaction: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

package tags

import (
	"errors"
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
	"strings"
)

type Tag struct {
	TagID      int    `json:"tagId"`
	Name       string `json:"name"`
	PhotoCount int    `json:"photoCount"`
}

func GetAllTags() ([]Tag, error) {
	query := `
		SELECT t.tag_id, t.name, COUNT(pt.file_path) as photo_count
		FROM tags t
		LEFT JOIN photo_tags pt ON t.tag_id = pt.tag_id
		GROUP BY t.tag_id, t.name
		ORDER BY photo_count DESC, t.name ASC
	`

	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("failed to query tags: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	tags := []Tag{}
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.TagID, &tag.Name, &tag.PhotoCount); err != nil {
			err = fmt.Errorf("failed to scan tag row: %w", err)
			slog.Error(err.Error())
			return nil, err
		}
		tags = append(tags, tag)
	}

	if err := rows.Err(); err != nil {
		err = fmt.Errorf("error iterating tag rows: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return tags, nil
}

func SearchTags(query string) ([]Tag, error) {
	searchQuery := `
		SELECT t.tag_id, t.name, COUNT(pt.file_path) as photo_count
		FROM tags t
		LEFT JOIN photo_tags pt ON t.tag_id = pt.tag_id
		WHERE t.name LIKE ?
		GROUP BY t.tag_id, t.name
		ORDER BY
			CASE WHEN t.name LIKE ? THEN 0 ELSE 1 END,
			photo_count DESC,
			t.name ASC
	`

	likePattern := "%" + query + "%"
	prefixPattern := query + "%"

	rows, err := sqlite.DB.Query(searchQuery, likePattern, prefixPattern)
	if err != nil {
		err = fmt.Errorf("failed to search tags: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	tags := []Tag{}
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.TagID, &tag.Name, &tag.PhotoCount); err != nil {
			err = fmt.Errorf("failed to scan tag row: %w", err)
			slog.Error(err.Error())
			return nil, err
		}
		tags = append(tags, tag)
	}

	if err := rows.Err(); err != nil {
		err = fmt.Errorf("error iterating tag rows: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return tags, nil
}

func CreateTag(name string) (*Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("tag name cannot be empty")
	}

	result, err := sqlite.DB.Exec("INSERT INTO tags (name) VALUES (?)", name)
	if err != nil {
		err = fmt.Errorf("failed to create tag: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	tagID, err := result.LastInsertId()
	if err != nil {
		err = fmt.Errorf("failed to get last insert id: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return &Tag{
		TagID:      int(tagID),
		Name:       name,
		PhotoCount: 0,
	}, nil
}

func UpdateTag(tagID int, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("tag name cannot be empty")
	}

	result, err := sqlite.DB.Exec("UPDATE tags SET name = ? WHERE tag_id = ?", name, tagID)
	if err != nil {
		err = fmt.Errorf("failed to update tag: %w", err)
		slog.Error(err.Error())
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		err = fmt.Errorf("failed to get rows affected: %w", err)
		slog.Error(err.Error())
		return err
	}

	if rowsAffected == 0 {
		return errors.New("tag not found")
	}

	return nil
}

func DeleteTag(tagID int) error {
	tx, err := sqlite.DB.Begin()
	if err != nil {
		err = fmt.Errorf("failed to begin transaction: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM photo_tags WHERE tag_id = ?", tagID); err != nil {
		err = fmt.Errorf("failed to delete photo tags: %w", err)
		slog.Error(err.Error())
		return err
	}

	result, err := tx.Exec("DELETE FROM tags WHERE tag_id = ?", tagID)
	if err != nil {
		err = fmt.Errorf("failed to delete tag: %w", err)
		slog.Error(err.Error())
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		err = fmt.Errorf("failed to get rows affected: %w", err)
		slog.Error(err.Error())
		return err
	}

	if rowsAffected == 0 {
		return errors.New("tag not found")
	}

	if err := tx.Commit(); err != nil {
		err = fmt.Errorf("failed to commit transaction: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func GetPhotoTags(filePath string) ([]Tag, error) {
	query := `
		SELECT t.tag_id, t.name
		FROM tags t
		INNER JOIN photo_tags pt ON t.tag_id = pt.tag_id
		WHERE pt.file_path = ?
		ORDER BY t.name ASC
	`

	rows, err := sqlite.DB.Query(query, filePath)
	if err != nil {
		err = fmt.Errorf("failed to query photo tags: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	tags := []Tag{}
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.TagID, &tag.Name); err != nil {
			err = fmt.Errorf("failed to scan tag row: %w", err)
			slog.Error(err.Error())
			return nil, err
		}
		tags = append(tags, tag)
	}

	if err := rows.Err(); err != nil {
		err = fmt.Errorf("error iterating tag rows: %w", err)
		slog.Error(err.Error())
		return nil, err
	}

	return tags, nil
}

func AddTagsToPhotos(tagIDs []int, filePaths []string) error {
	if len(tagIDs) == 0 || len(filePaths) == 0 {
		return errors.New("tagIDs and filePaths cannot be empty")
	}

	tx, err := sqlite.DB.Begin()
	if err != nil {
		err = fmt.Errorf("failed to begin transaction: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("INSERT OR IGNORE INTO photo_tags (file_path, tag_id) VALUES (?, ?)")
	if err != nil {
		err = fmt.Errorf("failed to prepare statement: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer stmt.Close()

	for _, filePath := range filePaths {
		for _, tagID := range tagIDs {
			if _, err := stmt.Exec(filePath, tagID); err != nil {
				err = fmt.Errorf("failed to insert photo tag: %w", err)
				slog.Error(err.Error())
				return err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		err = fmt.Errorf("failed to commit transaction: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func RemoveTagFromPhotos(tagID int, filePaths []string) error {
	if len(filePaths) == 0 {
		return errors.New("filePaths cannot be empty")
	}

	tx, err := sqlite.DB.Begin()
	if err != nil {
		err = fmt.Errorf("failed to begin transaction: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("DELETE FROM photo_tags WHERE tag_id = ? AND file_path = ?")
	if err != nil {
		err = fmt.Errorf("failed to prepare statement: %w", err)
		slog.Error(err.Error())
		return err
	}
	defer stmt.Close()

	for _, filePath := range filePaths {
		if _, err := stmt.Exec(tagID, filePath); err != nil {
			err = fmt.Errorf("failed to delete photo tag: %w", err)
			slog.Error(err.Error())
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		err = fmt.Errorf("failed to commit transaction: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

package settings

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"riffle/commons/sqlite"
)

type Setting struct {
	Key       string `json:"key"`
	Value     string `json:"value"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

func GetSetting(key string) (string, error) {
	query := `SELECT value FROM settings WHERE key = ?`
	var value string
	err := sqlite.DB.QueryRow(query, key).Scan(&value)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("setting not found: %s", key)
		}
		err = fmt.Errorf("error getting setting: %w", err)
		slog.Error(err.Error())
		return "", err
	}
	return value, nil
}

func GetAllSettings() (map[string]string, error) {
	query := `SELECT key, value FROM settings`
	rows, err := sqlite.DB.Query(query)
	if err != nil {
		err = fmt.Errorf("error getting all settings: %w", err)
		slog.Error(err.Error())
		return nil, err
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			slog.Error("error scanning setting row", "error", err)
			continue
		}
		settings[key] = value
	}

	return settings, nil
}

func UpsertSetting(key, value string) error {
	query := `
		INSERT INTO settings (key, value)
		VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET
			value = excluded.value,
			updated_at = CURRENT_TIMESTAMP
	`

	_, err := sqlite.DB.Exec(query, key, value)
	if err != nil {
		err = fmt.Errorf("error upserting setting: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

func DeleteSetting(key string) error {
	query := `DELETE FROM settings WHERE key = ?`

	_, err := sqlite.DB.Exec(query, key)
	if err != nil {
		err = fmt.Errorf("error deleting setting: %w", err)
		slog.Error(err.Error())
		return err
	}

	return nil
}

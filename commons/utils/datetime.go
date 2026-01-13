package utils

import (
	"fmt"
	"time"
)

func NormalizeDateTime(dtStr string, exifData map[string]any) string {
	if t := parseWithTimezone(dtStr); t != nil {
		return t.Format(time.RFC3339)
	}

	parsedTime := parseWithoutTimezone(dtStr)
	if parsedTime == nil {
		return dtStr
	}

	if offsetStr, ok := exifData["OffsetTimeOriginal"].(string); ok && offsetStr != "" {
		if loc := parseTimezoneOffset(offsetStr); loc != nil {
			return time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(),
				parsedTime.Hour(), parsedTime.Minute(), parsedTime.Second(), 0, loc).Format(time.RFC3339)
		}
	}

	if gpsDateTimeStr, ok := exifData["GPSDateTime"].(string); ok && gpsDateTimeStr != "" {
		if gpsTime := parseGPSDateTime(gpsDateTimeStr); gpsTime != nil {
			offsetSeconds := int(parsedTime.Sub(*gpsTime).Seconds())
			loc := time.FixedZone("", offsetSeconds)
			return time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(),
				parsedTime.Hour(), parsedTime.Minute(), parsedTime.Second(), 0, loc).Format(time.RFC3339)
		}
	}

	return time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(),
		parsedTime.Hour(), parsedTime.Minute(), parsedTime.Second(), 0, time.Local).Format(time.RFC3339)
}

func ParseDateTime(dtStr string) *time.Time {
	if t, err := time.Parse(time.RFC3339, dtStr); err == nil {
		return &t
	}

	fallbackFormats := []string{
		time.RFC3339Nano,
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05.999999999+07:00",
		"2006-01-02 15:04:05-07:00",
		"2006-01-02 15:04:05+07:00",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}

	for _, format := range fallbackFormats {
		if t, err := time.Parse(format, dtStr); err == nil {
			return &t
		}
	}

	return nil
}

func parseWithTimezone(dtStr string) *time.Time {
	formats := []string{
		time.RFC3339,
		"2006:01:02 15:04:05-07:00",
		"2006:01:02 15:04:05+07:00",
		"2006-01-02 15:04:05-07:00",
		"2006-01-02 15:04:05+07:00",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02T15:04:05+07:00",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dtStr); err == nil {
			return &t
		}
	}
	return nil
}

func parseWithoutTimezone(dtStr string) *time.Time {
	formats := []string{
		"2006:01:02 15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dtStr); err == nil {
			return &t
		}
	}
	return nil
}

func parseGPSDateTime(gpsDateTimeStr string) *time.Time {
	formats := []string{
		"2006:01:02 15:04:05Z",
		"2006-01-02 15:04:05Z",
		"2006:01:02 15:04:05",
		"2006-01-02 15:04:05",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, gpsDateTimeStr); err == nil {
			return &t
		}
	}
	return nil
}

func parseTimezoneOffset(offsetStr string) *time.Location {
	if len(offsetStr) < 5 {
		return nil
	}

	sign := 1
	if offsetStr[0] == '-' {
		sign = -1
	} else if offsetStr[0] != '+' {
		return nil
	}

	var hours, mins int
	if _, err := fmt.Sscanf(offsetStr[1:], "%d:%d", &hours, &mins); err != nil {
		return nil
	}

	return time.FixedZone("", sign*(hours*3600+mins*60))
}

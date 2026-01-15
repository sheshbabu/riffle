package utils

import (
	"fmt"
	"time"
)

// Converts datetime string to UTC in RFC3339 format.
//
// Photos taken across different timezones need UTC normalization for correct chronological
// sorting. For example, a photo at 20:09+05:30 (India) is actually later than one at
// 20:34+08:00 (Singapore) - but SQLite text sorting would order them wrong since "20:09" < "20:34".
// Converting to UTC (14:39Z vs 12:34Z) makes text sorting work correctly.
//
// Stages:
//  1. If the input already has a timezone, parse and convert to UTC
//  2. If no timezone, try OffsetTimeOriginal from EXIF (e.g., "+05:30")
//  3. If no offset, try calculating from GPSDateTime (which is always UTC)
//  4. Fallback: assume local timezone
func NormalizeDateTime(dtStr string, exifData map[string]any) string {
	if t := parseWithTimezone(dtStr); t != nil {
		return t.UTC().Format(time.RFC3339)
	}

	parsedTime := parseWithoutTimezone(dtStr)
	if parsedTime == nil {
		return dtStr
	}

	if offsetStr, ok := exifData["OffsetTimeOriginal"].(string); ok && offsetStr != "" {
		if loc := parseTimezoneOffset(offsetStr); loc != nil {
			t := time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(),
				parsedTime.Hour(), parsedTime.Minute(), parsedTime.Second(), 0, loc)
			return t.UTC().Format(time.RFC3339)
		}
	}

	if gpsDateTimeStr, ok := exifData["GPSDateTime"].(string); ok && gpsDateTimeStr != "" {
		if gpsTime := parseGPSDateTime(gpsDateTimeStr); gpsTime != nil {
			offsetSeconds := int(parsedTime.Sub(*gpsTime).Seconds())
			loc := time.FixedZone("", offsetSeconds)
			t := time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(),
				parsedTime.Hour(), parsedTime.Minute(), parsedTime.Second(), 0, loc)
			return t.UTC().Format(time.RFC3339)
		}
	}

	t := time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(),
		parsedTime.Hour(), parsedTime.Minute(), parsedTime.Second(), 0, time.Local)
	return t.UTC().Format(time.RFC3339)
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

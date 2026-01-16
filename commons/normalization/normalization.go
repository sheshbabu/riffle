package normalization

import (
	"regexp"
	"strconv"
	"strings"
)

func NormalizeWidth(width string) *int {
	if width == "" {
		return nil
	}

	val, err := strconv.Atoi(strings.TrimSpace(width))
	if err != nil {
		return nil
	}

	return &val
}

func NormalizeHeight(height string) *int {
	if height == "" {
		return nil
	}

	val, err := strconv.Atoi(strings.TrimSpace(height))
	if err != nil {
		return nil
	}

	return &val
}

// Normalize orientation string to EXIF integer value (1-8)
// 1 = Normal (Horizontal)
// 2 = Mirror horizontal
// 3 = Rotate 180
// 4 = Mirror vertical
// 5 = Mirror horizontal and rotate 270 CW
// 6 = Rotate 90 CW
// 7 = Mirror horizontal and rotate 90 CW
// 8 = Rotate 270 CW
func NormalizeOrientation(orientation string) *int {
	if orientation == "" {
		return nil
	}

	if val, err := strconv.Atoi(strings.TrimSpace(orientation)); err == nil {
		if val >= 1 && val <= 8 {
			return &val
		}
		return nil
	}

	orientationMap := map[string]int{
		"Horizontal (normal)": 1,
		"Normal":              1,
		"Rotate 180":          3,
		"Rotate 90 CW":        6,
		"Rotate 270 CW":       8,
		"Mirror horizontal":   2,
		"Mirror vertical":     4,
	}

	if val, ok := orientationMap[orientation]; ok {
		return &val
	}

	orientationLower := strings.ToLower(orientation)
	for key, val := range orientationMap {
		if strings.ToLower(key) == orientationLower {
			return &val
		}
	}

	return nil
}

func NormalizeISO(iso string) *int {
	if iso == "" {
		return nil
	}

	val, err := strconv.Atoi(strings.TrimSpace(iso))
	if err != nil {
		return nil
	}

	return &val
}

func NormalizeFNumber(fNumber string) *float64 {
	if fNumber == "" {
		return nil
	}

	val, err := strconv.ParseFloat(strings.TrimSpace(fNumber), 64)
	if err != nil {
		return nil
	}

	return &val
}

// Normalize exposure time string to decimal seconds
// "1/121", "1/16", "0.5", "1" -> 0.008264..., 0.0625, 0.5, 1.0
func NormalizeExposureTime(exposureTime string) *float64 {
	if exposureTime == "" {
		return nil
	}

	exposureTime = strings.TrimSpace(exposureTime)

	if strings.Contains(exposureTime, "/") {
		parts := strings.Split(exposureTime, "/")
		if len(parts) != 2 {
			return nil
		}

		numerator, err := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
		if err != nil {
			return nil
		}

		denominator, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
		if err != nil || denominator == 0 {
			return nil
		}

		val := numerator / denominator
		return &val
	}

	val, err := strconv.ParseFloat(exposureTime, 64)
	if err != nil {
		return nil
	}

	return &val
}

func NormalizeFocalLength(focalLength string) *float64 {
	if focalLength == "" {
		return nil
	}

	focalLength = strings.TrimSpace(focalLength)
	focalLength = strings.TrimSuffix(focalLength, "mm")
	focalLength = strings.TrimSuffix(focalLength, "MM")
	focalLength = strings.TrimSpace(focalLength)

	val, err := strconv.ParseFloat(focalLength, 64)
	if err != nil {
		return nil
	}

	return &val
}

// Normalize duration string to total seconds
// "0:01:23", "00:00:05", "1:30", "45" -> 83, 5, 90, 45
// "12.68 s" -> 12
//
// ExifTool outputs duration in two formats based on video length:
// - Videos < 30 seconds: decimal format "12.68 s"
// - Videos >= 30 seconds: time format "0:05:17" (H:MM:SS or MM:SS)
func NormalizeDuration(duration string) *int {
	if duration == "" {
		return nil
	}

	duration = strings.TrimSpace(duration)

	// Handle EXIF decimal format: "12.68 s" (videos < 30 seconds)
	duration = strings.TrimSuffix(duration, " s")
	duration = strings.TrimSuffix(duration, "s")
	duration = strings.TrimSpace(duration)

	// Try parsing as a decimal number (will truncate to int)
	if val, err := strconv.ParseFloat(duration, 64); err == nil {
		seconds := int(val)
		return &seconds
	}

	// Try parsing as integer
	if val, err := strconv.Atoi(duration); err == nil {
		return &val
	}

	// Handle EXIF time format: "0:05:17" (videos >= 30 seconds)
	parts := strings.Split(duration, ":")
	if len(parts) == 0 || len(parts) > 3 {
		return nil
	}

	totalSeconds := 0

	for i := len(parts) - 1; i >= 0; i-- {
		val, err := strconv.Atoi(strings.TrimSpace(parts[i]))
		if err != nil {
			return nil
		}

		multiplier := 1
		position := len(parts) - 1 - i
		if position == 1 {
			multiplier = 60 // minutes
		} else if position == 2 {
			multiplier = 3600 // hours
		}

		totalSeconds += val * multiplier
	}

	return &totalSeconds
}

// Normalize GPS coordinate (latitude or longitude) from DMS or decimal string to decimal float64
// "37 deg 46' 29.64\" N" -> 37.7749
// "122 deg 25' 9.84\" W" -> -122.4194
// "37.7749" -> 37.7749
func NormalizeGPSCoordinate(coordinate string) *float64 {
	if coordinate == "" {
		return nil
	}

	if val, err := strconv.ParseFloat(coordinate, 64); err == nil {
		return &val
	}

	dmsRegex := regexp.MustCompile(`(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"\s*([NSEW])`)
	matches := dmsRegex.FindStringSubmatch(coordinate)
	if len(matches) != 5 {
		return nil
	}

	deg, _ := strconv.ParseFloat(matches[1], 64)
	min, _ := strconv.ParseFloat(matches[2], 64)
	sec, _ := strconv.ParseFloat(matches[3], 64)
	dir := matches[4]

	decimal := deg + min/60 + sec/3600

	if dir == "S" || dir == "W" {
		decimal = -decimal
	}

	return &decimal
}

// Normalize ISO 6709 coordinates (used in video files) to separate lat/lon
// "+37.7749-122.4194/", "+37.7749-122.4194+10.5/" -> (37.7749, -122.4194)
// "37.7749 N, 122.4194 W" -> (37.7749, -122.4194)
func NormalizeISO6709Coordinates(coords string) (*float64, *float64) {
	if coords == "" {
		return nil, nil
	}

	iso6709Pattern := regexp.MustCompile(`^([+-]?\d+\.?\d*)\s*([+-]\d+\.?\d*)`)
	if matches := iso6709Pattern.FindStringSubmatch(coords); len(matches) >= 3 {
		lat, err1 := strconv.ParseFloat(matches[1], 64)
		lon, err2 := strconv.ParseFloat(matches[2], 64)
		if err1 == nil && err2 == nil {
			return &lat, &lon
		}
	}

	dmsPattern := regexp.MustCompile(`(\d+\.?\d*)\s*([NS]),?\s*(\d+\.?\d*)\s*([EW])`)
	if matches := dmsPattern.FindStringSubmatch(coords); len(matches) >= 5 {
		lat, err1 := strconv.ParseFloat(matches[1], 64)
		lon, err2 := strconv.ParseFloat(matches[3], 64)
		if err1 == nil && err2 == nil {
			if matches[2] == "S" {
				lat = -lat
			}
			if matches[4] == "W" {
				lon = -lon
			}
			return &lat, &lon
		}
	}

	return nil, nil
}

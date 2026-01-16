package normalization

import (
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
func NormalizeDuration(duration string) *int {
	if duration == "" {
		return nil
	}

	duration = strings.TrimSpace(duration)

	if val, err := strconv.Atoi(duration); err == nil {
		return &val
	}

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

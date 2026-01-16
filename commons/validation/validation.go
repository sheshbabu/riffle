package validation

import (
	"log/slog"
	"time"
)

func ValidateExifData(data map[string]any) map[string]any {
	validated := make(map[string]any)

	for key, value := range data {
		switch key {
		case "ISO":
			if v, ok := value.(int); ok {
				if result, valid := validateISO(v); valid {
					validated[key] = result
				}
			}
		case "FNumber":
			if v, ok := value.(float64); ok {
				if result, valid := validateAperture(v); valid {
					validated[key] = result
				}
			}
		case "ExposureTime":
			if v, ok := value.(float64); ok {
				if result, valid := validateExposureTime(v); valid {
					validated[key] = result
				}
			}
		case "FocalLength":
			if v, ok := value.(float64); ok {
				if result, valid := validateFocalLength(v); valid {
					validated[key] = result
				}
			}
		case "Latitude":
			if v, ok := value.(float64); ok {
				if result, valid := validateLatitude(v); valid {
					validated[key] = result
				}
			}
		case "Longitude":
			if v, ok := value.(float64); ok {
				if result, valid := validateLongitude(v); valid {
					validated[key] = result
				}
			}
		case "DateTime", "GPSDateTime", "OffsetTimeOriginal", "CreationDate", "CreateDate":
			if v, ok := value.(string); ok {
				if result, valid := validateDateTime(key, v); valid {
					validated[key] = result
				}
			}
		default:
			validated[key] = value
		}
	}

	return validated
}

// Check if ISO value is within reasonable range (50-102400)
func validateISO(isoVal int) (int, bool) {
	if isoVal < 50 || isoVal > 102400 {
		slog.Warn("iso value out of expected range", "iso", isoVal, "expected", "50-102400")
		// Don't reject, just log - some specialized cameras may exceed this
	}

	return isoVal, true
}

// Check if f-number is within reasonable range (f/0.95-f/64)
func validateAperture(fNum float64) (float64, bool) {
	if fNum < 0.95 || fNum > 64 {
		slog.Warn("aperture value out of expected range", "fNumber", fNum, "expected", "f/0.95-f/64")
		// Don't reject - some specialized lenses may exceed this
	}

	return fNum, true
}

// Check if exposure time is reasonable (not negative or extremely large)
func validateExposureTime(expTime float64) (float64, bool) {
	// Check for negative or extremely long exposures (> 30 seconds is suspicious)
	if expTime < 0 {
		slog.Warn("negative exposure time detected", "exposureTime", expTime)
		return 0, false // Reject negative values
	}

	if expTime > 30 {
		slog.Warn("unusually long exposure time", "exposureTime", expTime, "seconds", expTime)
		// Don't reject - long exposures are valid for night photography
	}

	return expTime, true
}

// Check if focal length is reasonable (1mm-3000mm)
func validateFocalLength(focal float64) (float64, bool) {
	if focal < 1 || focal > 3000 {
		slog.Warn("focal length out of expected range", "focalLength", focal, "expected", "1-3000mm")
		// Don't reject - some specialized lenses may exceed this
	}

	return focal, true
}

// Check if latitude is within valid range (-90 to 90)
func validateLatitude(lat float64) (float64, bool) {
	if lat < -90 || lat > 90 {
		slog.Warn("invalid latitude coordinate", "latitude", lat, "valid_range", "-90 to 90")
		return 0, false // Reject invalid coordinates
	}

	return lat, true
}

// Check if longitude is within valid range (-180 to 180)
func validateLongitude(lon float64) (float64, bool) {
	if lon < -180 || lon > 180 {
		slog.Warn("invalid longitude coordinate", "longitude", lon, "valid_range", "-180 to 180")
		return 0, false // Reject invalid coordinates
	}

	return lon, true
}

// Check for common invalid dates
func validateDateTime(fieldName string, str string) (string, bool) {
	// Try to parse the date using common formats
	dateFormats := []string{
		"2006:01:02 15:04:05",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02 15:04:05",
		time.RFC3339,
	}

	var parsedTime time.Time
	var err error

	for _, format := range dateFormats {
		parsedTime, err = time.Parse(format, str)
		if err == nil {
			break
		}
	}

	if err != nil {
		// If we can't parse it, keep the original value
		return str, true
	}

	// Check for Unix epoch (1970-01-01) - often indicates missing or corrupted data
	epochTime := time.Date(1970, 1, 1, 0, 0, 0, 0, time.UTC)
	if parsedTime.Year() == epochTime.Year() && parsedTime.Month() == epochTime.Month() && parsedTime.Day() == epochTime.Day() {
		slog.Warn("date set to unix epoch (likely invalid)", "field", fieldName, "date", str)
		return "", false // Reject epoch dates
	}

	// Check for dates before photography was invented (pre-1826)
	if parsedTime.Year() < 1826 {
		slog.Warn("date before photography was invented", "field", fieldName, "date", str, "year", parsedTime.Year())
		return "", false // Reject obviously invalid dates
	}

	// Check for future dates (more than 1 day in the future to account for timezone differences)
	futureThreshold := time.Now().Add(24 * time.Hour)
	if parsedTime.After(futureThreshold) {
		slog.Warn("date is in the future", "field", fieldName, "date", str, "parsed", parsedTime.Format(time.RFC3339))
		return "", false // Reject future dates
	}

	return str, true
}

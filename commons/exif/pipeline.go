package exif

import (
	"riffle/commons/normalization"
	"riffle/commons/validation"
)

// EXIF Data Pipeline: Extract -> Normalize -> Validate
// Extract:
// - Reads raw EXIF metadata from files using exiftool
// - Returns all fields as strings (except specialized types from exiftool)
// - No normalization or validation at this stage
// Normalize:
// - Converts strings to appropriate types (int, float64, etc.)
// - Handles format variations (DMS to decimal, fractions to decimals)
// - Returns nil for unparseable values
// Validate:
// - Checks normalized values against valid ranges
// - Rejects invalid values (epoch dates, out-of-range GPS, negative exposure)
// - Logs warnings for suspicious but potentially valid values

func ProcessExifData(filePath string) (map[string]any, error) {
	rawData, err := ExtractExif(filePath)
	if err != nil {
		return nil, err
	}

	if len(rawData) == 0 {
		return rawData, nil
	}

	normalized := make(map[string]any)

	// Normalize GPS coordinates
	if gpsLat, ok := rawData["GPSLatitude"].(string); ok {
		if lat := normalization.NormalizeGPSCoordinate(gpsLat); lat != nil {
			normalized["Latitude"] = *lat
		}
	}
	if gpsLon, ok := rawData["GPSLongitude"].(string); ok {
		if lon := normalization.NormalizeGPSCoordinate(gpsLon); lon != nil {
			normalized["Longitude"] = *lon
		}
	}
	// For videos: GPSCoordinates contains both lat/lon in ISO 6709 format
	if coords, ok := rawData["GPSCoordinates"].(string); ok {
		lat, lon := normalization.NormalizeISO6709Coordinates(coords)
		if lat != nil && lon != nil {
			normalized["Latitude"] = *lat
			normalized["Longitude"] = *lon
		}
	}

	// Normalize other EXIF fields
	if width, ok := rawData["Width"].(string); ok {
		if w := normalization.NormalizeWidth(width); w != nil {
			normalized["Width"] = *w
		}
	}
	if height, ok := rawData["Height"].(string); ok {
		if h := normalization.NormalizeHeight(height); h != nil {
			normalized["Height"] = *h
		}
	}
	if orientation, ok := rawData["Orientation"].(string); ok {
		if o := normalization.NormalizeOrientation(orientation); o != nil {
			normalized["Orientation"] = *o
		}
	}
	if iso, ok := rawData["ISO"].(string); ok {
		if i := normalization.NormalizeISO(iso); i != nil {
			normalized["ISO"] = *i
		}
	}
	if fNumber, ok := rawData["FNumber"].(string); ok {
		if fn := normalization.NormalizeFNumber(fNumber); fn != nil {
			normalized["FNumber"] = *fn
		}
	}
	if exposureTime, ok := rawData["ExposureTime"].(string); ok {
		if et := normalization.NormalizeExposureTime(exposureTime); et != nil {
			normalized["ExposureTime"] = *et
		}
	}
	if focalLength, ok := rawData["FocalLength"].(string); ok {
		if fl := normalization.NormalizeFocalLength(focalLength); fl != nil {
			normalized["FocalLength"] = *fl
		}
	}
	if duration, ok := rawData["Duration"].(string); ok {
		if d := normalization.NormalizeDuration(duration); d != nil {
			normalized["Duration"] = *d
		}
	}

	// Copy non-normalized fields (Make, Model, Software, DateTime, etc.)
	fieldsToNormalize := map[string]bool{
		"GPSLatitude": true, "GPSLongitude": true, "GPSCoordinates": true,
		"Width": true, "Height": true, "Orientation": true, "ISO": true,
		"FNumber": true, "ExposureTime": true, "FocalLength": true, "Duration": true,
	}
	for key, value := range rawData {
		if !fieldsToNormalize[key] {
			normalized[key] = value
		}
	}

	validated := validation.ValidateExifData(normalized)

	return validated, nil
}

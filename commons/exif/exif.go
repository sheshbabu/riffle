package exif

import (
	"fmt"
	"riffle/commons/utils"
	"strconv"

	"github.com/barasher/go-exiftool"
)

var et *exiftool.Exiftool

func init() {
	var err error
	et, err = exiftool.NewExiftool()
	if err != nil {
		panic(fmt.Sprintf("failed to initialize exiftool: %v", err))
	}
}

func ExtractExif(filePath string) (map[string]any, error) {
	fileInfos := et.ExtractMetadata(filePath)
	if len(fileInfos) == 0 {
		return make(map[string]any), nil
	}

	fileInfo := fileInfos[0]
	if fileInfo.Err != nil {
		return nil, fileInfo.Err
	}

	data := make(map[string]any)

	// DateTime: Check multiple fields in priority order
	// Photos: DateTimeOriginal
	// Videos: CreationDate (has timezone, local time) preferred over CreateDate (often UTC)
	dateFields := []string{"DateTimeOriginal", "CreationDate", "CreateDate", "MediaCreateDate", "TrackCreateDate"}
	for _, dateField := range dateFields {
		if val, err := fileInfo.GetString(dateField); err == nil && val != "" {
			data["DateTime"] = val
			break
		}
	}

	// OffsetTimeOriginal: Timezone offset for DateTimeOriginal (EXIF 2.31+)
	offsetFields := []string{"OffsetTimeOriginal", "OffsetTimeDigitized", "OffsetTime"}
	for _, offsetField := range offsetFields {
		if val, err := fileInfo.GetString(offsetField); err == nil && val != "" {
			data["OffsetTimeOriginal"] = val
			break
		}
	}

	// GPSDateTime: UTC time from GPS (can be used to calculate timezone offset)
	if val, err := fileInfo.GetString("GPSDateTime"); err == nil && val != "" {
		data["GPSDateTime"] = val
	}

	fieldMap := map[string]string{
		"Make":         "Make",
		"Model":        "Model",
		"Width":        "ImageWidth",
		"Height":       "ImageHeight",
		"Orientation":  "Orientation",
		"Software":     "Software",
		"ISO":          "ISO",
		"FNumber":      "FNumber",
		"ExposureTime": "ExposureTime",
		"FocalLength":  "FocalLength",
		"Flash":        "Flash",
		"ColorSpace":   "ColorSpace",
		"Duration":     "Duration",
	}

	for key, exifKey := range fieldMap {
		if val, err := fileInfo.GetString(exifKey); err == nil && val != "" {
			data[key] = val
		}
	}

	// GPS coordinates: photos use GPSLatitude/GPSLongitude, videos use GPSCoordinates
	// Normalize DMS format to decimal degrees for consistent storage
	if val, err := fileInfo.GetString("GPSLatitude"); err == nil && val != "" {
		decVal := utils.ParseDMSOrDecimal(val)
		if decVal != 0 {
			data["Latitude"] = decVal
		}
	}
	if val, err := fileInfo.GetString("GPSLongitude"); err == nil && val != "" {
		decVal := utils.ParseDMSOrDecimal(val)
		if decVal != 0 {
			data["Longitude"] = decVal
		}
	}

	// For videos: GPSCoordinates contains both lat/lon in ISO 6709 format (e.g., "+37.7749-122.4194/")
	if _, hasLat := data["Latitude"]; !hasLat {
		if coords, err := fileInfo.GetString("GPSCoordinates"); err == nil && coords != "" {
			lat, lon := utils.ParseISO6709Coordinates(coords)
			if lat != "" && lon != "" {
				if latFloat, err := strconv.ParseFloat(lat, 64); err == nil {
					data["Latitude"] = latFloat
				}
				if lonFloat, err := strconv.ParseFloat(lon, 64); err == nil {
					data["Longitude"] = lonFloat
				}
			}
		}
	}

	return data, nil
}

func Close() {
	if et != nil {
		et.Close()
	}
}

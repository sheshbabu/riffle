package exif

import (
	"fmt"

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

func HasExif(filePath string) bool {
	data, err := ExtractExif(filePath)
	return err == nil && len(data) > 0
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

	// DateTime: Check multiple fields in priority order (photos use DateTimeOriginal, videos use CreateDate/MediaCreateDate)
	dateFields := []string{"DateTimeOriginal", "CreateDate", "MediaCreateDate", "TrackCreateDate", "CreationDate"}
	for _, dateField := range dateFields {
		if val, err := fileInfo.GetString(dateField); err == nil && val != "" {
			data["DateTime"] = val
			break
		}
	}

	fieldMap := map[string]string{
		"Make":         "Make",
		"Model":        "Model",
		"Width":        "ImageWidth",
		"Height":       "ImageHeight",
		"Latitude":     "GPSLatitude",
		"Longitude":    "GPSLongitude",
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

	return data, nil
}

func Close() {
	if et != nil {
		et.Close()
	}
}

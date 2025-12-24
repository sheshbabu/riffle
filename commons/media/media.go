package media

import (
	"path/filepath"
	"strings"
)

func IsMediaFile(filename string) bool {
	return IsImageFile(filename) || IsVideoFile(filename)
}

func IsImageFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	validExtensions := []string{".jpg", ".jpeg", ".png", ".gif", ".heic", ".heif", ".webp", ".bmp", ".tiff", ".tif"}

	for _, validExt := range validExtensions {
		if ext == validExt {
			return true
		}
	}
	return false
}

func IsVideoFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	validExtensions := []string{".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".mpg", ".mpeg"}

	for _, validExt := range validExtensions {
		if ext == validExt {
			return true
		}
	}
	return false
}

func GetContentType(ext string) string {
	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".heic":
		return "image/heic"
	case ".heif":
		return "image/heif"
	case ".webp":
		return "image/webp"
	case ".bmp":
		return "image/bmp"
	case ".tiff", ".tif":
		return "image/tiff"
	case ".mp4":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".avi":
		return "video/x-msvideo"
	case ".mkv":
		return "video/x-matroska"
	case ".wmv":
		return "video/x-ms-wmv"
	case ".flv":
		return "video/x-flv"
	case ".webm":
		return "video/webm"
	case ".m4v":
		return "video/x-m4v"
	case ".mpg", ".mpeg":
		return "video/mpeg"
	default:
		return "application/octet-stream"
	}
}

func GetFileMetadata(filePath string) (string, string) {
	ext := strings.ToLower(filepath.Ext(filePath))
	fileFormat := strings.TrimPrefix(ext, ".")
	mimeType := GetContentType(ext)
	return fileFormat, mimeType
}

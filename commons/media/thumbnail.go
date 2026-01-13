package media

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	ThumbnailWidth  = 300
	ThumbnailHeight = 300
)

func GenerateThumbnail(sourcePath, thumbnailPath string) error {
	if err := os.MkdirAll(filepath.Dir(thumbnailPath), 0755); err != nil {
		return fmt.Errorf("failed to create thumbnail directory: %w", err)
	}

	var thumbnailData []byte
	var err error

	if IsVideoFile(sourcePath) {
		thumbnailData, _, err = GenerateVideoThumbnail(sourcePath, ThumbnailWidth, ThumbnailHeight)
		if err != nil {
			return fmt.Errorf("failed to generate video thumbnail: %w", err)
		}
	} else if IsImageFile(sourcePath) {
		imageData, err := os.ReadFile(sourcePath)
		if err != nil {
			return fmt.Errorf("failed to read image file: %w", err)
		}
		thumbnailData, _, err = ResizeImage(imageData, sourcePath, ThumbnailWidth, ThumbnailHeight)
		if err != nil {
			return fmt.Errorf("failed to resize image: %w", err)
		}
	} else {
		return fmt.Errorf("unsupported file type: %s", sourcePath)
	}

	if err := os.WriteFile(thumbnailPath, thumbnailData, 0644); err != nil {
		return fmt.Errorf("failed to write thumbnail: %w", err)
	}

	return nil
}

func GetThumbnailPath(libraryPath, thumbnailsPath, photoPath string) string {
	relativePath := strings.TrimPrefix(photoPath, libraryPath)
	relativePath = strings.TrimPrefix(relativePath, string(filepath.Separator))

	ext := filepath.Ext(relativePath)
	thumbnailRelPath := strings.TrimSuffix(relativePath, ext) + ".jpg"

	return filepath.Join(thumbnailsPath, thumbnailRelPath)
}

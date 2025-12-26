package media

import (
	"fmt"
	"path/filepath"
	"riffle/commons/exif"
	"strconv"
	"strings"

	"github.com/h2non/bimg"
)

func ResizeImage(imageData []byte, filePath string, maxWidth, maxHeight int) ([]byte, string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))

	img := bimg.NewImage(imageData)

	// Get EXIF orientation and apply rotation for HEIC (bimg AutoRotate doesn't work for HEIC)
	if ext == ".heic" || ext == ".heif" {
		orientation := getOrientation(filePath)
		if orientation > 1 {
			rotated, err := img.Process(bimg.Options{
				Rotate: OrientationToAngle(orientation),
				Flip:   OrientationNeedsFlip(orientation),
			})
			if err == nil {
				img = bimg.NewImage(rotated)
			}
		}
	}

	size, err := img.Size()
	if err != nil {
		return nil, "", fmt.Errorf("failed to get image size: %w", err)
	}

	if size.Width <= maxWidth && size.Height <= maxHeight {
		return imageData, GetContentType(ext), nil
	}

	newWidth, newHeight := calculateDimensions(size.Width, size.Height, maxWidth, maxHeight)

	resized, err := img.Process(bimg.Options{
		Width:         newWidth,
		Height:        newHeight,
		Type:          bimg.JPEG,
		Quality:       85,
		StripMetadata: true,
	})
	if err != nil {
		return nil, "", fmt.Errorf("failed to resize image: %w", err)
	}

	return resized, "image/jpeg", nil
}


func getOrientation(filePath string) int {
	data, err := exif.ExtractExif(filePath)
	if err != nil {
		return 1
	}
	orientationStr, ok := data["Orientation"].(string)
	if !ok {
		return 1
	}
	orientation, err := strconv.Atoi(orientationStr)
	if err != nil || orientation < 1 || orientation > 8 {
		return 1
	}
	return orientation
}

func calculateDimensions(width, height, maxWidth, maxHeight int) (int, int) {
	aspectRatio := float64(width) / float64(height)

	newWidth := maxWidth
	newHeight := int(float64(newWidth) / aspectRatio)

	if newHeight > maxHeight {
		newHeight = maxHeight
		newWidth = int(float64(newHeight) * aspectRatio)
	}

	return newWidth, newHeight
}

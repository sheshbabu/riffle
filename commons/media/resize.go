package media

import (
	"fmt"
	"path/filepath"
	"riffle/commons/exif"
	"riffle/commons/normalization"
	"strings"

	"github.com/h2non/bimg"
)

func ResizeImage(imageData []byte, filePath string, maxWidth, maxHeight int) ([]byte, string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))
	isHEIC := ext == ".heic" || ext == ".heif"

	img := bimg.NewImage(imageData)
	orientation := getOrientation(filePath)

	var width, height int

	if isHEIC {
		// Manually apply rotation as bimg AutoRotate doesn't work for HEIC
		if orientation > 1 {
			rotated, err := img.Process(bimg.Options{
				Rotate: OrientationToAngle(orientation),
				Flip:   OrientationNeedsFlip(orientation),
			})
			if err == nil {
				img = bimg.NewImage(rotated)
			}
		}

		size, err := img.Size()
		if err != nil {
			return nil, "", fmt.Errorf("failed to get image size: %w", err)
		}

		width = size.Width
		height = size.Height
	} else {
		// bimg will auto-rotate during resize
		size, err := img.Size()
		if err != nil {
			return nil, "", fmt.Errorf("failed to get image size: %w", err)
		}

		width = size.Width
		height = size.Height

		// Swap dimensions if orientation requires 90° or 270° rotation
		if orientation == 5 || orientation == 6 || orientation == 7 || orientation == 8 {
			width, height = height, width
		}
	}

	if width <= maxWidth && height <= maxHeight {
		return imageData, GetContentType(ext), nil
	}

	newWidth, newHeight := calculateDimensions(width, height, maxWidth, maxHeight)

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
	orientationPtr := normalization.NormalizeOrientation(orientationStr)
	if orientationPtr == nil {
		return 1
	}
	return *orientationPtr
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

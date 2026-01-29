package media

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/h2non/bimg"
)

func ResizeImage(imageData []byte, filePath string, maxWidth, maxHeight int, orientation int) ([]byte, string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))
	isHEIC := ext == ".heic" || ext == ".heif"

	img := bimg.NewImage(imageData)
	isLandscape := orientation == OrientationLandscapeLeft || orientation == OrientationLandscapeRight

	size, err := img.Size()
	width, height := size.Width, size.Height

	if err != nil {
		return nil, "", fmt.Errorf("failed to get image size: %w", err)
	}

	if isLandscape && !isHEIC {
		width, height = height, width
	}

	newWidth, newHeight := calculateDimensions(width, height, maxWidth, maxHeight)

	resized, err := img.Process(bimg.Options{
		Width:   newWidth,
		Height:  newHeight,
		Type:    bimg.JPEG,
		Quality: 85,
	})

	if err != nil {
		return nil, "", fmt.Errorf("failed to process image: %w", err)
	}

	return resized, "image/jpeg", nil
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

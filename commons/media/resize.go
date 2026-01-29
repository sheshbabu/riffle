package media

import (
	"fmt"

	"github.com/h2non/bimg"
)

func ResizeImage(imageData []byte, filePath string, maxWidth, maxHeight int, orientation int) ([]byte, string, error) {
	img := bimg.NewImage(imageData)

	size, err := img.Size()
	if err != nil {
		return nil, "", fmt.Errorf("failed to get image size: %w", err)
	}

	newWidth, newHeight := calculateDimensions(size.Width, size.Height, maxWidth, maxHeight)

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

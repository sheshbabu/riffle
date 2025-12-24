package media

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"path/filepath"
	"strings"

	"github.com/adrium/goheif"
	"golang.org/x/image/draw"
	"golang.org/x/image/webp"
)

func ResizeImage(imageData []byte, filePath string, maxWidth, maxHeight int) ([]byte, string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))

	img, format, err := decodeImage(imageData, ext)
	if err != nil {
		return nil, "", fmt.Errorf("failed to decode image: %w", err)
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	if width <= maxWidth && height <= maxHeight {
		return imageData, GetContentType(ext), nil
	}

	newWidth, newHeight := calculateDimensions(width, height, maxWidth, maxHeight)

	resizedImg := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	draw.BiLinear.Scale(resizedImg, resizedImg.Bounds(), img, img.Bounds(), draw.Over, nil)

	buf := new(bytes.Buffer)
	err = encodeImage(buf, resizedImg, format)
	if err != nil {
		return nil, "", fmt.Errorf("failed to encode resized image: %w", err)
	}

	return buf.Bytes(), GetContentType(ext), nil
}

func decodeImage(data []byte, ext string) (image.Image, string, error) {
	reader := bytes.NewReader(data)

	switch ext {
	case ".jpg", ".jpeg":
		img, err := jpeg.Decode(reader)
		return img, "jpeg", err
	case ".png":
		img, err := png.Decode(reader)
		return img, "png", err
	case ".gif":
		img, err := gif.Decode(reader)
		return img, "gif", err
	case ".webp":
		img, err := webp.Decode(reader)
		return img, "webp", err
	case ".heic", ".heif":
		img, err := goheif.Decode(reader)
		return img, "heif", err
	default:
		return nil, "", fmt.Errorf("unsupported image format: %s", ext)
	}
}

func encodeImage(buf *bytes.Buffer, img image.Image, format string) error {
	switch format {
	case "jpeg":
		return jpeg.Encode(buf, img, &jpeg.Options{Quality: 85})
	case "png":
		return png.Encode(buf, img)
	case "gif":
		return gif.Encode(buf, img, nil)
	case "webp":
		return jpeg.Encode(buf, img, &jpeg.Options{Quality: 85})
	case "heif":
		return jpeg.Encode(buf, img, &jpeg.Options{Quality: 85})
	default:
		return fmt.Errorf("unsupported encoding format: %s", format)
	}
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

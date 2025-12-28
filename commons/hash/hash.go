package hash

import (
	"crypto/sha256"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"math/bits"
	"os"
	"strconv"

	_ "github.com/adrium/goheif"
	"github.com/corona10/goimagehash"
	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/tiff"
	_ "golang.org/x/image/webp"
)

func ComputeSHA256(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("failed to compute hash: %w", err)
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

func ComputeDhash(filePath string) (uint64, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return 0, fmt.Errorf("failed to open image: %w", err)
	}
	defer file.Close()

	img, _, err := image.Decode(file)
	if err != nil {
		return 0, fmt.Errorf("failed to decode image: %w", err)
	}

	hash, err := goimagehash.DifferenceHash(img)
	if err != nil {
		return 0, fmt.Errorf("failed to compute dhash: %w", err)
	}

	return hash.GetHash(), nil
}

func HammingDistance(dhash1, dhash2 string) (int, error) {
	hash1, err := strconv.ParseUint(dhash1, 16, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse dhash1: %w", err)
	}

	hash2, err := strconv.ParseUint(dhash2, 16, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse dhash2: %w", err)
	}

	xor := hash1 ^ hash2
	return bits.OnesCount64(xor), nil
}

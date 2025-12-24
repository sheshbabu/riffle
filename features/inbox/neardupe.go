package inbox

import (
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log/slog"
	"os"
	"riffle/commons/media"

	_ "github.com/adrium/goheif"
	"github.com/corona10/goimagehash"
	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/tiff"
	_ "golang.org/x/image/webp"
)

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

func FindNearDuplicates(photos []PhotoFile, threshold int) map[string][]PhotoFile {
	groups := make(map[string][]PhotoFile)
	processed := make(map[string]bool)

	for i := range photos {
		if !media.IsImageFile(photos[i].Path) || photos[i].Dhash == 0 {
			continue
		}

		if processed[photos[i].Hash] {
			continue
		}

		hash1 := goimagehash.NewImageHash(photos[i].Dhash, goimagehash.DHash)

		var group []PhotoFile
		group = append(group, photos[i])
		processed[photos[i].Hash] = true

		for j := i + 1; j < len(photos); j++ {
			if !media.IsImageFile(photos[j].Path) || photos[j].Dhash == 0 {
				continue
			}

			if processed[photos[j].Hash] {
				continue
			}

			hash2 := goimagehash.NewImageHash(photos[j].Dhash, goimagehash.DHash)

			distance, err := hash1.Distance(hash2)
			if err != nil {
				slog.Error("failed to compute distance", "file1", photos[i].Path, "file2", photos[j].Path, "error", err)
				continue
			}

			if distance <= threshold {
				group = append(group, photos[j])
				processed[photos[j].Hash] = true
			}
		}

		if len(group) > 1 {
			groupKey := fmt.Sprintf("near_%d", len(groups))
			groups[groupKey] = group
		}
	}

	return groups
}

func SelectBestCandidate(duplicates []PhotoFile) PhotoFile {
	if len(duplicates) == 0 {
		panic("no duplicates provided")
	}
	if len(duplicates) == 1 {
		return duplicates[0]
	}

	best := duplicates[0]
	bestScore := scoreImage(best)

	for _, photo := range duplicates[1:] {
		score := scoreImage(photo)
		if score.betterThan(bestScore) {
			best = photo
			bestScore = score
		}
	}

	return best
}

type imageScore struct {
	resolution int64
	hasExif    bool
	fileSize   int64
}

func (s imageScore) betterThan(other imageScore) bool {
	if s.resolution != other.resolution {
		return s.resolution > other.resolution
	}
	if s.hasExif != other.hasExif {
		return s.hasExif
	}
	return s.fileSize > other.fileSize
}

func scoreImage(photo PhotoFile) imageScore {
	score := imageScore{
		fileSize: photo.Size,
		hasExif:  photo.HasExif,
	}

	if photo.ExifData != nil {
		if width, ok := photo.ExifData["Width"].(string); ok {
			if height, ok := photo.ExifData["Height"].(string); ok {
				var w, h int64
				fmt.Sscanf(width, "%d", &w)
				fmt.Sscanf(height, "%d", &h)
				score.resolution = w * h
			}
		}
	}

	return score
}

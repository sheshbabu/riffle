package dedupe

import (
	"crypto/sha256"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"riffle/commons/exif"
	"strings"
	"time"
)

type PhotoFile struct {
	Path     string
	Size     int64
	Hash     string
	HasExif  bool
	ExifData map[string]any
}

type DuplicateFile struct {
	Path        string         `json:"path"`
	Size        int64          `json:"size"`
	HasExif     bool           `json:"hasExif"`
	IsCandidate bool           `json:"isCandidate"`
	ExifData    map[string]any `json:"exifData,omitempty"`
}

type DuplicateGroup struct {
	Hash  string          `json:"hash"`
	Files []DuplicateFile `json:"files"`
}

type FileAction struct {
	Path     string         `json:"path"`
	Hash     string         `json:"hash"`
	ExifData map[string]any `json:"exifData,omitempty"`
}

type DedupeStats struct {
	TotalScanned      int              `json:"totalScanned"`
	UniqueFiles       int              `json:"uniqueFiles"`
	DuplicateGroups   int              `json:"duplicateGroups"`
	DuplicatesRemoved int              `json:"duplicatesRemoved"`
	MovedToLibrary    int              `json:"movedToLibrary"`
	MovedToTrash      int              `json:"movedToTrash"`
	Duplicates        []DuplicateGroup `json:"duplicates"`
	FilesToLibrary    []FileAction     `json:"filesToLibrary"`
	FilesToTrash      []FileAction     `json:"filesToTrash"`
}

func ProcessInbox(inboxPath, libraryPath, trashPath string) (*DedupeStats, error) {
	slog.Info("starting deduplication analysis")

	photos, err := ScanDirectory(inboxPath)
	if err != nil {
		return nil, fmt.Errorf("failed to scan inbox: %w", err)
	}

	slog.Info("scanned inbox", "count", len(photos))

	stats := &DedupeStats{
		TotalScanned:   len(photos),
		FilesToLibrary: make([]FileAction, 0),
		FilesToTrash:   make([]FileAction, 0),
	}

	sizeGroups := GroupBySize(photos)
	slog.Info("grouped by size", "groups", len(sizeGroups))

	hashGroups := make(map[string][]PhotoFile)
	for size, group := range sizeGroups {
		if len(group) == 1 {
			hash, err := ComputeHash(group[0].Path)
			if err != nil {
				slog.Error("failed to compute hash", "file", group[0].Path, "error", err)
				continue
			}
			group[0].Hash = hash

			exifData, err := exif.ExtractExif(group[0].Path)
			if err == nil && len(exifData) > 0 {
				group[0].HasExif = true
				group[0].ExifData = exifData
			}

			hashGroups[hash] = append(hashGroups[hash], group[0])
			continue
		}

		slog.Info("processing size group", "size", size, "count", len(group))

		for i := range group {
			hash, err := ComputeHash(group[i].Path)
			if err != nil {
				slog.Error("failed to compute hash", "file", group[i].Path, "error", err)
				continue
			}
			group[i].Hash = hash

			exifData, err := exif.ExtractExif(group[i].Path)
			if err == nil && len(exifData) > 0 {
				group[i].HasExif = true
				group[i].ExifData = exifData
			}

			hashGroups[hash] = append(hashGroups[hash], group[i])
		}
	}

	slog.Info("computed hashes", "unique", len(hashGroups))

	for hash, duplicates := range hashGroups {
		if len(duplicates) == 1 {
			candidate := duplicates[0]
			stats.UniqueFiles++

			stats.FilesToLibrary = append(stats.FilesToLibrary, FileAction{
				Path:     candidate.Path,
				Hash:     candidate.Hash,
				ExifData: candidate.ExifData,
			})
			slog.Info("unique file will move to library", "file", candidate.Path)
			continue
		}

		slog.Info("found duplicates", "hash", hash, "count", len(duplicates))
		stats.DuplicateGroups++
		candidate := SelectCandidate(duplicates)

		if candidate.HasExif {
			slog.Info("selected candidate", "file", candidate.Path, "hasExif", true, "exifData", candidate.ExifData)
		} else {
			slog.Info("selected candidate", "file", candidate.Path, "hasExif", false)
		}

		duplicateGroup := DuplicateGroup{
			Hash:  hash[:16],
			Files: make([]DuplicateFile, 0, len(duplicates)),
		}

		for _, photo := range duplicates {
			duplicateFile := DuplicateFile{
				Path:        photo.Path,
				Size:        photo.Size,
				HasExif:     photo.HasExif,
				IsCandidate: photo.Path == candidate.Path,
				ExifData:    photo.ExifData,
			}
			duplicateGroup.Files = append(duplicateGroup.Files, duplicateFile)

			if photo.Path == candidate.Path {
				stats.FilesToLibrary = append(stats.FilesToLibrary, FileAction{
					Path:     photo.Path,
					Hash:     photo.Hash,
					ExifData: photo.ExifData,
				})
				slog.Info("candidate will move to library", "file", photo.Path)
			} else {
				stats.DuplicatesRemoved++
				stats.FilesToTrash = append(stats.FilesToTrash, FileAction{
					Path:     photo.Path,
					Hash:     photo.Hash,
					ExifData: photo.ExifData,
				})
				slog.Info("duplicate will move to trash", "file", photo.Path)
			}
		}

		stats.Duplicates = append(stats.Duplicates, duplicateGroup)
	}

	slog.Info("deduplication analysis completed")

	fmt.Println()
	fmt.Println("=== Analysis Summary ===")
	fmt.Printf("Total files scanned:      %d\n", stats.TotalScanned)
	fmt.Printf("Unique files:             %d\n", stats.UniqueFiles)
	fmt.Printf("Duplicate groups found:   %d\n", stats.DuplicateGroups)
	fmt.Printf("Duplicates to remove:     %d\n", stats.DuplicatesRemoved)
	fmt.Printf("Files to move to library: %d\n", len(stats.FilesToLibrary))
	fmt.Printf("Files to move to trash:   %d\n", len(stats.FilesToTrash))
	fmt.Println()

	return stats, nil
}

func ScanDirectory(path string) ([]PhotoFile, error) {
	var photos []PhotoFile

	err := filepath.WalkDir(path, func(filePath string, entry os.DirEntry, err error) error {
		if err != nil {
			slog.Error("failed to access path", "path", filePath, "error", err)
			return nil
		}

		if entry.IsDir() {
			return nil
		}

		if !isMediaFile(entry.Name()) {
			return nil
		}

		info, err := entry.Info()
		if err != nil {
			slog.Error("failed to get file info", "file", filePath, "error", err)
			return nil
		}

		photos = append(photos, PhotoFile{
			Path: filePath,
			Size: info.Size(),
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	return photos, nil
}

func isMediaFile(filename string) bool {
	return isImageFile(filename) || isVideoFile(filename)
}

func isImageFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	validExtensions := []string{".jpg", ".jpeg", ".png", ".gif", ".heic", ".heif", ".webp", ".bmp", ".tiff", ".tif"}

	for _, validExt := range validExtensions {
		if ext == validExt {
			return true
		}
	}
	return false
}

func isVideoFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	validExtensions := []string{".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".mpg", ".mpeg"}

	for _, validExt := range validExtensions {
		if ext == validExt {
			return true
		}
	}
	return false
}

func GroupBySize(photos []PhotoFile) map[int64][]PhotoFile {
	groups := make(map[int64][]PhotoFile)
	for _, photo := range photos {
		groups[photo.Size] = append(groups[photo.Size], photo)
	}
	return groups
}

func ComputeHash(filePath string) (string, error) {
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

func ExecuteMoves(libraryPath, trashPath string, stats *DedupeStats) error {
	slog.Info("starting file moves", "toLibrary", len(stats.FilesToLibrary), "toTrash", len(stats.FilesToTrash))

	movedToLibrary := 0
	movedToTrash := 0

	for _, action := range stats.FilesToLibrary {
		photo := PhotoFile{
			Path:     action.Path,
			Hash:     action.Hash,
			ExifData: action.ExifData,
			HasExif:  len(action.ExifData) > 0,
		}

		if err := moveFile(photo, libraryPath); err != nil {
			slog.Error("failed to move file to library", "file", photo.Path, "error", err)
			continue
		}
		slog.Info("moved to library", "file", photo.Path)
		movedToLibrary++
	}

	for _, action := range stats.FilesToTrash {
		photo := PhotoFile{
			Path:     action.Path,
			Hash:     action.Hash,
			ExifData: action.ExifData,
			HasExif:  len(action.ExifData) > 0,
		}

		if err := moveFile(photo, trashPath); err != nil {
			slog.Error("failed to move file to trash", "file", photo.Path, "error", err)
			continue
		}
		slog.Info("moved to trash", "file", photo.Path)
		movedToTrash++
	}

	stats.MovedToLibrary = movedToLibrary
	stats.MovedToTrash = movedToTrash

	slog.Info("file moves completed", "movedToLibrary", movedToLibrary, "movedToTrash", movedToTrash)

	fmt.Println()
	fmt.Println("=== Execution Summary ===")
	fmt.Printf("Files moved to library:   %d\n", movedToLibrary)
	fmt.Printf("Files moved to trash:     %d\n", movedToTrash)
	fmt.Println()

	return nil
}

func moveFile(photo PhotoFile, destDir string) error {
	var dateTime time.Time
	var hasDateTime bool

	if dtStr, ok := photo.ExifData["DateTime"].(string); ok {
		formats := []string{
			"2006:01:02 15:04:05",
			"2006-01-02 15:04:05",
			"2006:01:02 15:04:05-07:00",
			"2006-01-02T15:04:05",
		}
		for _, format := range formats {
			if dt, err := time.Parse(format, dtStr); err == nil {
				dateTime = dt
				hasDateTime = true
				break
			}
		}
	}

	var destPath string
	ext := filepath.Ext(photo.Path)
	hashPrefix := photo.Hash[:16]

	if hasDateTime {
		year := dateTime.Format("2006")
		month := dateTime.Format("01")
		monthName := dateTime.Format("January")
		folderName := fmt.Sprintf("%s - %s", month, monthName)

		destFolder := filepath.Join(destDir, year, folderName)
		if err := os.MkdirAll(destFolder, 0755); err != nil {
			return fmt.Errorf("failed to create destination folder: %w", err)
		}

		filename := fmt.Sprintf("%s-%s%s", dateTime.Format("2006-01-02-150405"), hashPrefix, ext)
		destPath = filepath.Join(destFolder, filename)
	} else {
		destFolder := filepath.Join(destDir, "Unknown")
		if err := os.MkdirAll(destFolder, 0755); err != nil {
			return fmt.Errorf("failed to create Unknown folder: %w", err)
		}

		filename := fmt.Sprintf("%s%s", hashPrefix, ext)
		destPath = filepath.Join(destFolder, filename)
	}

	if _, err := os.Stat(destPath); err == nil {
		base := strings.TrimSuffix(filepath.Base(destPath), ext)
		counter := 1
		for {
			newFilename := fmt.Sprintf("%s_%d%s", base, counter, ext)
			destPath = filepath.Join(filepath.Dir(destPath), newFilename)
			if _, err := os.Stat(destPath); os.IsNotExist(err) {
				break
			}
			counter++
		}
	}

	if err := os.Rename(photo.Path, destPath); err != nil {
		return fmt.Errorf("failed to move file: %w", err)
	}

	return nil
}

// Priority:
// 1. Has EXIF data (more likely to be original)
// 2. If tie, pick first (they're identical anyway)
func SelectCandidate(duplicates []PhotoFile) PhotoFile {
	if len(duplicates) == 0 {
		panic("no duplicates provided")
	}
	if len(duplicates) == 1 {
		return duplicates[0]
	}

	best := duplicates[0]
	for _, photo := range duplicates[1:] {
		if photo.HasExif && !best.HasExif {
			best = photo
		}
	}

	return best
}

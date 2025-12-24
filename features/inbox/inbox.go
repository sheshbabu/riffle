package inbox

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"riffle/commons/exif"
	"riffle/commons/hash"
	"riffle/commons/media"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type PhotoFile struct {
	Path       string
	Size       int64
	Hash       string
	Dhash      uint64
	HasExif    bool
	ExifData   map[string]any
	FileFormat string
	MimeType   string
	IsVideo    bool
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
	Dhash    uint64         `json:"dhash,omitempty"`
	ExifData map[string]any `json:"exifData,omitempty"`
}

type AnalysisStats struct {
	InboxPath         string           `json:"inboxPath"`
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

func ProcessInbox(inboxPath, libraryPath, trashPath string) (*AnalysisStats, error) {
	slog.Info("starting import analysis")

	photos, err := ScanDirectory(inboxPath)
	if err != nil {
		return nil, fmt.Errorf("failed to scan inbox: %w", err)
	}

	slog.Info("scanned inbox", "count", len(photos))

	stats := &AnalysisStats{
		InboxPath:      inboxPath,
		TotalScanned:   len(photos),
		FilesToLibrary: make([]FileAction, 0),
		FilesToTrash:   make([]FileAction, 0),
	}

	sizeGroups := GroupBySize(photos)
	slog.Info("grouped by size", "groups", len(sizeGroups))

	workers := runtime.NumCPU()
	if workers > 16 {
		workers = 16
	}
	slog.Info("processing files with parallel workers", "workers", workers, "cpus", runtime.NumCPU())
	processFilesParallel(photos, workers)

	hashGroups := make(map[string][]PhotoFile)
	for i := range photos {
		if photos[i].Hash == "" {
			continue
		}
		hashGroups[photos[i].Hash] = append(hashGroups[photos[i].Hash], photos[i])
	}

	slog.Info("computed hashes", "unique", len(hashGroups))

	for hash, duplicates := range hashGroups {
		if len(duplicates) == 1 {
			candidate := duplicates[0]
			stats.UniqueFiles++

			stats.FilesToLibrary = append(stats.FilesToLibrary, FileAction{
				Path:     candidate.Path,
				Hash:     candidate.Hash,
				Dhash:    candidate.Dhash,
				ExifData: candidate.ExifData,
			})
			continue
		}

		stats.DuplicateGroups++
		candidate := SelectCandidate(duplicates)

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
					Dhash:    photo.Dhash,
					ExifData: photo.ExifData,
				})
			} else {
				stats.DuplicatesRemoved++
				stats.FilesToTrash = append(stats.FilesToTrash, FileAction{
					Path:     photo.Path,
					Hash:     photo.Hash,
					Dhash:    photo.Dhash,
					ExifData: photo.ExifData,
				})
			}
		}

		stats.Duplicates = append(stats.Duplicates, duplicateGroup)
	}

	slog.Info("import analysis completed")

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

		if !media.IsMediaFile(entry.Name()) {
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

func GroupBySize(photos []PhotoFile) map[int64][]PhotoFile {
	groups := make(map[int64][]PhotoFile)
	for _, photo := range photos {
		groups[photo.Size] = append(groups[photo.Size], photo)
	}
	return groups
}

func processFile(photo *PhotoFile) {
	sha256Hash, err := hash.ComputeSHA256(photo.Path)
	if err != nil {
		slog.Error("failed to compute hash", "file", photo.Path, "error", err)
		return
	}
	photo.Hash = sha256Hash

	if media.IsImageFile(photo.Path) {
		dhash, err := hash.ComputeDhash(photo.Path)
		if err != nil {
			slog.Error("failed to compute dhash", "file", photo.Path, "error", err)
		} else {
			photo.Dhash = dhash
		}
	}

	exifData, err := exif.ExtractExif(photo.Path)
	if err == nil && len(exifData) > 0 {
		photo.HasExif = true
		photo.ExifData = exifData
	}
}

func processFilesParallel(files []PhotoFile, workerCount int) []PhotoFile {
	var wg sync.WaitGroup
	var processed atomic.Int64
	fileChan := make(chan int, len(files))
	total := int64(len(files))

	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range fileChan {
				processFile(&files[i])

				count := processed.Add(1)
				if count%1000 == 0 || count == total {
					slog.Info("processing progress", "completed", count, "total", total, "percent", int(float64(count)/float64(total)*100))
				}
			}
		}()
	}

	for i := range files {
		fileChan <- i
	}
	close(fileChan)

	wg.Wait()
	return files
}

func ExecuteMoves(libraryPath, trashPath string, stats *AnalysisStats) error {
	slog.Info("starting file moves", "toLibrary", len(stats.FilesToLibrary), "toTrash", len(stats.FilesToTrash))

	movedToLibrary := 0
	movedToTrash := 0

	for _, action := range stats.FilesToLibrary {
		photo := PhotoFile{
			Path:     action.Path,
			Hash:     action.Hash,
			Dhash:    action.Dhash,
			ExifData: action.ExifData,
			HasExif:  len(action.ExifData) > 0,
			Size:     0,
		}

		if fileInfo, err := os.Stat(photo.Path); err == nil {
			photo.Size = fileInfo.Size()
		}

		newPath, err := moveFile(photo, libraryPath)
		if err != nil {
			slog.Error("failed to move file to library", "file", photo.Path, "error", err)
			continue
		}

		photo.Path = newPath
		photo.FileFormat, photo.MimeType = media.GetFileMetadata(newPath)
		photo.IsVideo = media.IsVideoFile(newPath)

		if err := CreatePhoto(photo); err != nil {
			slog.Error("failed to insert photo to database", "file", photo.Path, "error", err)
		}

		movedToLibrary++
	}

	for _, action := range stats.FilesToTrash {
		photo := PhotoFile{
			Path:     action.Path,
			Hash:     action.Hash,
			ExifData: action.ExifData,
			HasExif:  len(action.ExifData) > 0,
		}

		_, err := moveFile(photo, trashPath)
		if err != nil {
			slog.Error("failed to move file to trash", "file", photo.Path, "error", err)
			continue
		}
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

func moveFile(photo PhotoFile, destDir string) (string, error) {
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

	if !hasDateTime {
		if fileInfo, err := os.Stat(photo.Path); err == nil {
			dateTime = fileInfo.ModTime()
			hasDateTime = true
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
			return "", fmt.Errorf("failed to create destination folder: %w", err)
		}

		filename := fmt.Sprintf("%s-%s%s", dateTime.Format("2006-01-02-150405"), hashPrefix, ext)
		destPath = filepath.Join(destFolder, filename)
	} else {
		destFolder := filepath.Join(destDir, "Unknown")
		if err := os.MkdirAll(destFolder, 0755); err != nil {
			return "", fmt.Errorf("failed to create Unknown folder: %w", err)
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
		return "", fmt.Errorf("failed to move file: %w", err)
	}

	return destPath, nil
}

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

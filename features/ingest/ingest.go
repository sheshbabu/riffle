package ingest

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"riffle/commons/cache"
	"riffle/commons/exif"
	"riffle/commons/hash"
	"riffle/commons/media"
	"riffle/features/settings"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

type PhotoFile struct {
	Path             string
	Size             int64
	Hash             string
	Dhash            uint64
	HasExif          bool
	ExifData         map[string]any
	FileFormat       string
	MimeType         string
	IsVideo          bool
	FileCreatedAt    time.Time
	FileModifiedAt   time.Time
	OriginalFilepath string
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
	Path             string         `json:"path"`
	Hash             string         `json:"hash"`
	Dhash            uint64         `json:"dhash,omitempty"`
	ExifData         map[string]any `json:"exifData,omitempty"`
	FileCreatedAt    time.Time      `json:"fileCreatedAt,omitempty"`
	FileModifiedAt   time.Time      `json:"fileModifiedAt,omitempty"`
	OriginalFilepath string         `json:"originalFilepath"`
}

type AnalysisStats struct {
	ImportPath        string           `json:"importPath"`
	TotalScanned      int              `json:"totalScanned"`
	UniqueFiles       int              `json:"uniqueFiles"`
	DuplicateGroups   int              `json:"duplicateGroups"`
	DuplicatesRemoved int              `json:"duplicatesRemoved"`
	MovedToLibrary    int              `json:"movedToLibrary"`
	AlreadyImported   int              `json:"alreadyImported"`
	Duplicates        []DuplicateGroup `json:"duplicates"`
	FilesToImport     []FileAction     `json:"filesToImport"`
	DuplicatesSkipped []FileAction     `json:"duplicatesSkipped"`
}

func ProcessIngest(importPath, libraryPath string) (*AnalysisStats, error) {
	slog.Info("starting import analysis")
	sessionID := GetCurrentImportSessionID()

	UpdateProgress(StatusScanning, 0, 0)
	photos, err := ScanDirectory(importPath)
	if err != nil {
		return nil, fmt.Errorf("failed to scan ingest folder: %w", err)
	}

	slog.Info("scanned ingest folder", "totalFiles", len(photos))

	if len(photos) == 0 {
		slog.Info("no media files found in import folder")
		stats := &AnalysisStats{
			ImportPath:        importPath,
			TotalScanned:      0,
			AlreadyImported:   0,
			UniqueFiles:       0,
			FilesToImport:     make([]FileAction, 0),
			DuplicatesSkipped: make([]FileAction, 0),
		}
		return stats, nil
	}

	if sessionID > 0 {
		UpdateImportSessionStatus(sessionID, "hashing")
	}

	UpdateProgress(StatusHashing, 0, len(photos))
	workers := runtime.NumCPU()
	if workers > 16 {
		workers = 16
	}
	slog.Info("processing files with parallel workers", "workers", workers, "cpus", runtime.NumCPU())
	processFilesParallel(photos, workers)

	if sessionID > 0 {
		UpdateImportSessionStatus(sessionID, "checking_imported")
	}

	UpdateProgress(StatusCheckingImported, 0, len(photos))
	var newPhotos []PhotoFile
	var alreadyImported int
	for i := range photos {
		if photos[i].Hash == "" {
			continue
		}
		exists, err := CheckHashExists(photos[i].Hash)
		if err != nil {
			slog.Error("failed to check hash existence", "file", photos[i].Path, "error", err)
			newPhotos = append(newPhotos, photos[i])
			continue
		}
		if exists {
			alreadyImported++
		} else {
			newPhotos = append(newPhotos, photos[i])
		}

		processed := i + 1
		if processed%100 == 0 || processed == len(photos) {
			UpdateProgress(StatusCheckingImported, processed, len(photos))
		}
	}

	totalScanned := len(photos)
	photos = newPhotos
	slog.Info("filtered already-imported photos", "total", totalScanned, "toProcess", len(photos), "alreadyImported", alreadyImported)

	if len(photos) == 0 && alreadyImported > 0 {
		slog.Info("all files already imported, nothing to process")
		stats := &AnalysisStats{
			ImportPath:        importPath,
			TotalScanned:      totalScanned,
			AlreadyImported:   alreadyImported,
			UniqueFiles:       0,
			FilesToImport:     make([]FileAction, 0),
			DuplicatesSkipped: make([]FileAction, 0),
		}
		return stats, nil
	}

	stats := &AnalysisStats{
		ImportPath:        importPath,
		TotalScanned:      totalScanned,
		AlreadyImported:   alreadyImported,
		FilesToImport:     make([]FileAction, 0),
		DuplicatesSkipped: make([]FileAction, 0),
	}

	if sessionID > 0 {
		UpdateImportSessionStatus(sessionID, "finding_duplicates")
	}

	UpdateProgress(StatusFindingDuplicates, 0, 0)
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

			stats.FilesToImport = append(stats.FilesToImport, FileAction{
				Path:             candidate.Path,
				Hash:             candidate.Hash,
				Dhash:            candidate.Dhash,
				ExifData:         candidate.ExifData,
				FileCreatedAt:    candidate.FileCreatedAt,
				FileModifiedAt:   candidate.FileModifiedAt,
				OriginalFilepath: candidate.OriginalFilepath,
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
				stats.FilesToImport = append(stats.FilesToImport, FileAction{
					Path:             photo.Path,
					Hash:             photo.Hash,
					Dhash:            photo.Dhash,
					ExifData:         photo.ExifData,
					FileCreatedAt:    photo.FileCreatedAt,
					FileModifiedAt:   photo.FileModifiedAt,
					OriginalFilepath: photo.OriginalFilepath,
				})
			} else {
				stats.DuplicatesRemoved++
				stats.DuplicatesSkipped = append(stats.DuplicatesSkipped, FileAction{
					Path:             photo.Path,
					Hash:             photo.Hash,
					Dhash:            photo.Dhash,
					ExifData:         photo.ExifData,
					FileCreatedAt:    photo.FileCreatedAt,
					FileModifiedAt:   photo.FileModifiedAt,
					OriginalFilepath: photo.OriginalFilepath,
				})
			}
		}

		stats.Duplicates = append(stats.Duplicates, duplicateGroup)
	}

	slog.Info("import analysis completed")

	fmt.Println()
	fmt.Println("=== Analysis Summary ===")
	fmt.Printf("Total files scanned:      %d\n", stats.TotalScanned)
	fmt.Printf("Already imported:         %d\n", stats.AlreadyImported)
	fmt.Printf("Unique files:             %d\n", stats.UniqueFiles)
	fmt.Printf("Duplicate groups found:   %d\n", stats.DuplicateGroups)
	fmt.Printf("Duplicates to remove:     %d\n", stats.DuplicatesRemoved)
	fmt.Printf("Files to move to library: %d\n", len(stats.FilesToImport))
	fmt.Printf("Files to skip:            %d\n", len(stats.DuplicatesSkipped)+stats.AlreadyImported)
	fmt.Println()

	return stats, nil
}

func ScanDirectory(path string) ([]PhotoFile, error) {
	var photos []PhotoFile
	var scannedCount int

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

		fileModifiedAt := info.ModTime()
		fileCreatedAt := getFileCreatedAt(info)

		photos = append(photos, PhotoFile{
			Path:             filePath,
			Size:             info.Size(),
			FileModifiedAt:   fileModifiedAt,
			FileCreatedAt:    fileCreatedAt,
			OriginalFilepath: filePath,
		})

		scannedCount++
		if scannedCount%100 == 0 {
			UpdateProgress(StatusScanning, scannedCount, 0)
			slog.Info("scanning progress", "scanned", scannedCount)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	UpdateProgress(StatusScanning, scannedCount, scannedCount)
	slog.Info("scan completed", "totalFiles", scannedCount)

	return photos, nil
}

func processFile(photo *PhotoFile) {
	// Compute SHA256 hash
	sha256Hash, err := hash.ComputeSHA256(photo.Path)
	if err != nil {
		slog.Error("failed to compute hash", "file", photo.Path, "error", err)
		return
	}
	photo.Hash = sha256Hash

	burstDetectionEnabled, _ := settings.GetBurstDetectionEnabled()
	if burstDetectionEnabled && media.IsImageFile(photo.Path) {
		dhash, err := hash.ComputeDhash(photo.Path)
		if err != nil {
			slog.Error("failed to compute dhash", "file", photo.Path, "error", err)
		} else {
			photo.Dhash = dhash
		}
	}

	exifData, err := exif.ProcessExifData(photo.Path)
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
				if count%100 == 0 || count == total {
					UpdateProgress(StatusHashing, int(count), int(total))
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

func ExecuteMoves(libraryPath, thumbnailsPath string, stats *AnalysisStats, importMode settings.ImportMode) error {
	total := len(stats.FilesToImport)
	sessionID := GetCurrentImportSessionID()

	if importMode == settings.ImportModeCopy {
		slog.Info("starting file copies", "toLibrary", total)
	} else {
		slog.Info("starting file moves", "toLibrary", total)
	}

	UpdateProgress(StatusImporting, 0, total)

	movedToLibrary := 0

	for _, action := range stats.FilesToImport {
		photo := PhotoFile{
			Path:             action.Path,
			Hash:             action.Hash,
			Dhash:            action.Dhash,
			ExifData:         action.ExifData,
			HasExif:          len(action.ExifData) > 0,
			Size:             0,
			FileCreatedAt:    action.FileCreatedAt,
			FileModifiedAt:   action.FileModifiedAt,
			OriginalFilepath: action.OriginalFilepath,
		}

		if fileInfo, err := os.Stat(photo.Path); err == nil {
			photo.Size = fileInfo.Size()
		}

		originalPath := photo.Path

		newPath, err := transferFile(photo, libraryPath, importMode)
		if err != nil {
			slog.Error("failed to transfer file to library", "file", photo.Path, "error", err)
			if sessionID > 0 {
				RecordImportedPhoto(sessionID, originalPath, "error", err.Error())
				IncrementImportErrors(sessionID)
			}
			continue
		}

		photo.Path = newPath
		photo.FileFormat, photo.MimeType = media.GetFileMetadata(newPath)
		photo.IsVideo = media.IsVideoFile(newPath)

		if err := CreatePhoto(photo); err != nil {
			slog.Error("failed to insert photo to database", "file", photo.Path, "error", err)
			if sessionID > 0 {
				RecordImportedPhoto(sessionID, photo.Path, "error", err.Error())
				IncrementImportErrors(sessionID)
			}
			continue
		}

		thumbnailPath := media.GetThumbnailPath(libraryPath, thumbnailsPath, photo.Path)
		orientation := 1
		if o, ok := photo.ExifData["Orientation"].(int); ok {
			orientation = o
		}
		if err := media.GenerateThumbnail(photo.Path, thumbnailPath, orientation, photo.IsVideo); err != nil {
			slog.Error("failed to generate thumbnail", "file", photo.Path, "error", err)
		} else {
			if err := UpdatePhotoThumbnail(photo.Path, thumbnailPath); err != nil {
				slog.Error("failed to update photo thumbnail path", "file", photo.Path, "error", err)
			}
		}

		if sessionID > 0 {
			RecordImportedPhoto(sessionID, photo.Path, "success", "")
		}

		movedToLibrary++
		UpdateProgress(StatusImporting, movedToLibrary, total)
	}

	stats.MovedToLibrary = movedToLibrary

	UpdateProgress(StatusImportingComplete, movedToLibrary, total)
	cache.InvalidateOnImport()

	if importMode == settings.ImportModeCopy {
		slog.Info("file copies completed", "copiedToLibrary", movedToLibrary)
	} else {
		slog.Info("file moves completed", "movedToLibrary", movedToLibrary)
	}

	slog.Info("duplicate files skipped", "count", len(stats.DuplicatesSkipped))
	slog.Info("already imported files skipped", "count", stats.AlreadyImported)

	fmt.Println()
	fmt.Println("=== Execution Summary ===")
	if importMode == settings.ImportModeCopy {
		fmt.Printf("Files copied to library:  %d\n", movedToLibrary)
	} else {
		fmt.Printf("Files moved to library:   %d\n", movedToLibrary)
	}
	fmt.Printf("Duplicates skipped:       %d\n", len(stats.DuplicatesSkipped))
	fmt.Printf("Already imported skipped: %d\n", stats.AlreadyImported)
	fmt.Println()

	return nil
}

func transferFile(photo PhotoFile, destDir string, importMode settings.ImportMode) (string, error) {
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

	if importMode == settings.ImportModeCopy {
		if err := copyFile(photo.Path, destPath); err != nil {
			return "", fmt.Errorf("failed to copy file: %w", err)
		}
	} else {
		if err := moveFile(photo.Path, destPath); err != nil {
			return "", fmt.Errorf("failed to move file: %w", err)
		}
	}

	destHash, err := hash.ComputeSHA256(destPath)
	if err != nil {
		os.Remove(destPath)
		return "", fmt.Errorf("failed to verify transferred file: %w", err)
	}

	if destHash != photo.Hash {
		os.Remove(destPath)
		return "", fmt.Errorf("checksum mismatch after transfer (expected %s, got %s)", photo.Hash[:16], destHash[:16])
	}

	if !photo.FileModifiedAt.IsZero() {
		atime := photo.FileModifiedAt
		mtime := photo.FileModifiedAt
		if err := os.Chtimes(destPath, atime, mtime); err != nil {
			slog.Error("failed to preserve file modification time", "file", destPath, "error", err)
		}
	}

	return destPath, nil
}

func copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	buf := make([]byte, 1024*1024)
	_, err = io.CopyBuffer(dstFile, srcFile, buf)
	if err != nil {
		return err
	}

	return dstFile.Sync()
}

func moveFile(src, dst string) error {
	err := os.Rename(src, dst)
	if err == nil {
		return nil
	}

	var linkErr *os.LinkError
	if errors.As(err, &linkErr) && errors.Is(linkErr.Err, syscall.EXDEV) {
		if err := copyFile(src, dst); err != nil {
			return err
		}
		return os.Remove(src)
	}

	return err
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

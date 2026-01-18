package photos

import (
	"sync"
)

type ThumbnailRebuildStatus string

const (
	StatusThumbnailRebuildIdle       ThumbnailRebuildStatus = "idle"
	StatusThumbnailRebuildProcessing ThumbnailRebuildStatus = "processing"
	StatusThumbnailRebuildComplete   ThumbnailRebuildStatus = "complete"
)

type ThumbnailRebuildProgress struct {
	Status    ThumbnailRebuildStatus `json:"status"`
	Completed int                    `json:"completed"`
	Total     int                    `json:"total"`
	Percent   int                    `json:"percent"`
}

var (
	thumbnailProgressMutex   sync.RWMutex
	currentThumbnailProgress ThumbnailRebuildProgress
)

func UpdateThumbnailProgress(status ThumbnailRebuildStatus, completed, total int) {
	thumbnailProgressMutex.Lock()
	defer thumbnailProgressMutex.Unlock()

	percent := 0
	if total > 0 {
		percent = int(float64(completed) / float64(total) * 100)
	}

	currentThumbnailProgress = ThumbnailRebuildProgress{
		Status:    status,
		Completed: completed,
		Total:     total,
		Percent:   percent,
	}
}

func GetThumbnailProgress() ThumbnailRebuildProgress {
	thumbnailProgressMutex.RLock()
	defer thumbnailProgressMutex.RUnlock()
	return currentThumbnailProgress
}

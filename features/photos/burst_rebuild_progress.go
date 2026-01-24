package photos

import (
	"sync"
)

type BurstRebuildStatus string

const (
	StatusBurstRebuildIdle       BurstRebuildStatus = "idle"
	StatusBurstRebuildProcessing BurstRebuildStatus = "processing"
	StatusBurstRebuildComplete   BurstRebuildStatus = "complete"
)

type BurstRebuildProgress struct {
	Status    BurstRebuildStatus `json:"status"`
	Completed int                `json:"completed"`
	Total     int                `json:"total"`
	Percent   int                `json:"percent"`
}

var (
	burstProgressMutex   sync.RWMutex
	currentBurstProgress BurstRebuildProgress
)

func UpdateBurstProgress(status BurstRebuildStatus, completed, total int) {
	burstProgressMutex.Lock()
	defer burstProgressMutex.Unlock()

	percent := 0
	if total > 0 {
		percent = int(float64(completed) / float64(total) * 100)
	}

	currentBurstProgress = BurstRebuildProgress{
		Status:    status,
		Completed: completed,
		Total:     total,
		Percent:   percent,
	}
}

func GetBurstProgress() BurstRebuildProgress {
	burstProgressMutex.RLock()
	defer burstProgressMutex.RUnlock()
	return currentBurstProgress
}

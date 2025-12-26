package ingest

import (
	"sync"
)

type ProgressStatus struct {
	Status    string `json:"status"`
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
	Percent   int    `json:"percent"`
}

var (
	progressMutex   sync.RWMutex
	currentProgress ProgressStatus
)

func UpdateProgress(status string, completed, total int) {
	progressMutex.Lock()
	defer progressMutex.Unlock()

	percent := 0
	if total > 0 {
		percent = int(float64(completed) / float64(total) * 100)
	}

	currentProgress = ProgressStatus{
		Status:    status,
		Completed: completed,
		Total:     total,
		Percent:   percent,
	}
}

func GetProgress() ProgressStatus {
	progressMutex.RLock()
	defer progressMutex.RUnlock()
	return currentProgress
}

package ingest

import (
	"sync"
)

type Status string

const (
	StatusScanning          Status = "scanning"
	StatusHashing           Status = "hashing"
	StatusFindingDuplicates Status = "finding_duplicates"
	StatusComplete          Status = "complete"
)

type ProgressStatus struct {
	Status    Status `json:"status"`
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
	Percent   int    `json:"percent"`
}

var (
	progressMutex   sync.RWMutex
	currentProgress ProgressStatus
)

func UpdateProgress(status Status, completed, total int) {
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

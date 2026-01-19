package export

import (
	"sync"
)

type Status string

const (
	StatusIdle            Status = "idle"
	StatusCollecting      Status = "collecting"
	StatusExporting       Status = "exporting"
	StatusExportComplete  Status = "export_complete"
	StatusExportError     Status = "export_error"
)

type ProgressStatus struct {
	Status    Status `json:"status"`
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
	Percent   int    `json:"percent"`
	Message   string `json:"message"`
}

var (
	progressMutex   sync.RWMutex
	currentProgress ProgressStatus
)

func UpdateProgress(status Status, completed, total int, message string) {
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
		Message:   message,
	}
}

func GetProgress() ProgressStatus {
	progressMutex.RLock()
	defer progressMutex.RUnlock()
	return currentProgress
}

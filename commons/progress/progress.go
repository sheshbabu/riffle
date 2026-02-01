package progress

import (
	"fmt"
	"sync"
)

type OperationType string

const (
	OperationImport           OperationType = "import"
	OperationExport           OperationType = "export"
	OperationThumbnailRebuild OperationType = "thumbnail_rebuild"
	OperationBurstRebuild     OperationType = "burst_rebuild"
)

type Status string

const (
	StatusIdle           Status = "idle"
	StatusStarting       Status = "starting"
	StatusScanning       Status = "scanning"
	StatusHashing        Status = "hashing"
	StatusDuplicateCheck Status = "duplicate_check"
	StatusMovingFiles    Status = "moving_files"
	StatusExporting      Status = "exporting"
	StatusProcessing     Status = "processing"
	StatusCompleted      Status = "completed"
	StatusError          Status = "error"
	StatusCancelled      Status = "cancelled"
)

type Progress struct {
	Operation OperationType `json:"operation"`
	Status    Status        `json:"status"`
	Completed int           `json:"completed"`
	Total     int           `json:"total"`
	Percent   int           `json:"percent"`
	Message   string        `json:"message"`
}

var (
	currentProgress Progress
	mu              sync.RWMutex
)

func StartOperation(opType OperationType) error {
	mu.Lock()
	defer mu.Unlock()

	if currentProgress.Operation != "" && !isComplete(currentProgress.Status) {
		return fmt.Errorf("operation already in progress: %s", currentProgress.Operation)
	}

	currentProgress = Progress{
		Operation: opType,
		Status:    StatusStarting,
		Completed: 0,
		Total:     0,
		Percent:   0,
		Message:   "",
	}

	return nil
}

func Update(status Status, completed, total int, message string) {
	mu.Lock()
	defer mu.Unlock()

	currentProgress.Status = status
	currentProgress.Completed = completed
	currentProgress.Total = total
	currentProgress.Message = message

	if total > 0 {
		currentProgress.Percent = (completed * 100) / total
	} else {
		currentProgress.Percent = 0
	}
}

func Get() Progress {
	mu.RLock()
	defer mu.RUnlock()
	return currentProgress
}

func CompleteOperation() {
	mu.Lock()
	defer mu.Unlock()

	if isComplete(currentProgress.Status) {
		currentProgress.Operation = ""
	}
}

func isComplete(status Status) bool {
	return status == StatusCompleted || status == StatusError || status == StatusCancelled || status == StatusIdle
}

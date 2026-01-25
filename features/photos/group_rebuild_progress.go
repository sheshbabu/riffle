package photos

import (
	"sync"
)

type GroupRebuildStatus string

const (
	StatusGroupRebuildIdle       GroupRebuildStatus = "idle"
	StatusGroupRebuildProcessing GroupRebuildStatus = "processing"
	StatusGroupRebuildComplete   GroupRebuildStatus = "complete"
)

type GroupRebuildProgress struct {
	Status    GroupRebuildStatus `json:"status"`
	Completed int                `json:"completed"`
	Total     int                `json:"total"`
	Percent   int                `json:"percent"`
}

var (
	groupProgressMutex   sync.RWMutex
	currentGroupProgress GroupRebuildProgress
)

func UpdateGroupProgress(status GroupRebuildStatus, completed, total int) {
	groupProgressMutex.Lock()
	defer groupProgressMutex.Unlock()

	percent := 0
	if total > 0 {
		percent = int(float64(completed) / float64(total) * 100)
	}

	currentGroupProgress = GroupRebuildProgress{
		Status:    status,
		Completed: completed,
		Total:     total,
		Percent:   percent,
	}
}

func GetGroupProgress() GroupRebuildProgress {
	groupProgressMutex.RLock()
	defer groupProgressMutex.RUnlock()
	return currentGroupProgress
}

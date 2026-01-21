package ingest

import (
	"sync"
)

var (
	resultsMutex        sync.RWMutex
	currentResults      *AnalysisStats
	currentImportSessionID int64
)

func SetResults(stats *AnalysisStats) {
	resultsMutex.Lock()
	defer resultsMutex.Unlock()
	currentResults = stats
}

func GetResults() *AnalysisStats {
	resultsMutex.RLock()
	defer resultsMutex.RUnlock()
	return currentResults
}

func ClearResults() {
	resultsMutex.Lock()
	defer resultsMutex.Unlock()
	currentResults = nil
	currentImportSessionID = 0
}

func SetCurrentImportSessionID(sessionID int64) {
	resultsMutex.Lock()
	defer resultsMutex.Unlock()
	currentImportSessionID = sessionID
}

func GetCurrentImportSessionID() int64 {
	resultsMutex.RLock()
	defer resultsMutex.RUnlock()
	return currentImportSessionID
}

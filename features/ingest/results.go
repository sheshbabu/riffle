package ingest

import (
	"sync"
)

var (
	resultsMutex   sync.RWMutex
	currentResults *AnalysisStats
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
}

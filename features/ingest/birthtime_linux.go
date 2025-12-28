//go:build linux

package ingest

import (
	"os"
	"syscall"
	"time"
)

func getFileCreatedAt(info os.FileInfo) time.Time {
	// Linux doesn't have birth time in syscall.Stat_t
	// Fall back to modification time
	if stat, ok := info.Sys().(*syscall.Stat_t); ok {
		return time.Unix(stat.Mtim.Sec, stat.Mtim.Nsec)
	}
	return time.Time{}
}

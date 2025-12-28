//go:build darwin

package ingest

import (
	"os"
	"syscall"
	"time"
)

func getFileCreatedAt(info os.FileInfo) time.Time {
	if stat, ok := info.Sys().(*syscall.Stat_t); ok {
		return time.Unix(stat.Birthtimespec.Sec, stat.Birthtimespec.Nsec)
	}
	return time.Time{}
}

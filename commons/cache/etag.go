package cache

import (
	"net/http"
	"strconv"
	"sync"
	"time"
)

type ETagCache struct {
	version int64
	mutex   sync.RWMutex
}

func NewETagCache() *ETagCache {
	return &ETagCache{
		version: time.Now().Unix(),
	}
}

func (c *ETagCache) GetVersion() string {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return strconv.FormatInt(c.version, 10)
}

func (c *ETagCache) Invalidate() {
	c.mutex.Lock()
	c.version = time.Now().Unix()
	c.mutex.Unlock()
}

func (c *ETagCache) CheckAndRespond(w http.ResponseWriter, r *http.Request, maxAge int) bool {
	etag := c.GetVersion()
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "private, max-age="+strconv.Itoa(maxAge))

	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return true
	}
	return false
}

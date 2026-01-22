package cache

var (
	CalendarCache = NewETagCache()
	FiltersCache  = NewETagCache()
)

func InvalidateOnPhotoCuration() {
	CalendarCache.Invalidate()
	FiltersCache.Invalidate()
}

func InvalidateOnImport() {
	CalendarCache.Invalidate()
	FiltersCache.Invalidate()
}

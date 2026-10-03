# Go Backend Guidelines

## Error Handling
- Use error wrapping with context: `fmt.Errorf("context: %w", err)`
- Don't log errors you return. Log once where an error stops propagating: `SendErrorResponse` logs for handlers, and background goroutines, best-effort calls and swallowed errors log with `slog.Error()`
- Handle `sql.ErrNoRows` separately using `errors.Is()`
- Models return `utils.ErrNotFound` (wrapped with `%w`) when a lookup finds no row or an update/delete of a single resource affects zero rows. Handlers pass 500 to `SendErrorResponse`, which sends 404 for `ErrNotFound`
- Import/export session bookkeeping (`Update*Session*`, `Record*Photo`, `Increment*`) is best-effort: it logs and returns nothing. Typed settings getters (`settings.GetImportMode` etc.) log and fall back to a default
- Use `panic()` only for critical initialization errors

## HTTP Handlers
- Function signature: `func HandleXXX(w http.ResponseWriter, r *http.Request)`
- Naming: `Handle{Action}{Resource}` (e.g., `HandleGetPhotos`, `HandleUpload`)
- Structure: Parse/validate → Business logic → Response
- Send JSON with `utils.SendJSONResponse(w, status, value)`, never `json.NewEncoder(w)` directly
- Send errors with `utils.SendErrorResponse(w, status, code, message, err)`. Pass the error for failures so it gets logged, and `nil` for client mistakes (validation, bad input)

## API Endpoints
- RESTful patterns with a trailing slash: `GET /api/resource/`, `POST /api/resource/`, `PUT /api/resource/{id}/`
- Routes are registered in `main.go` with `mux.HandleFunc("METHOD /path/", handler)`
- The frontend calls the same trailing-slash paths to avoid redirects

## Struct & Logging
- Descriptive names (e.g., `PhotoFile` not `Photo`), full words not abbreviations
- Use one struct for DB and API unless their shapes differ; then keep the DB struct separate and map it to a response struct (e.g., `ImportSession` and `ImportSessionsResponse`)
- Request bodies that aren't a resource are `{Action}Request` (e.g., `CreateAlbumRequest`)
- Use camelCase JSON tags: `json:"fieldName"`
- Use `slog` package with lowercase messages and key-value pairs

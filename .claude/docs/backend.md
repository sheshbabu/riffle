# Go Backend Guidelines

## Error Handling
- Use error wrapping with context: `fmt.Errorf("context: %w", err)`
- Always log errors with `slog.Error()` before returning
- Handle `sql.ErrNoRows` separately using `errors.Is()`
- Use `panic()` only for critical initialization errors

## HTTP Handlers
- Function signature: `func HandleXXX(w http.ResponseWriter, r *http.Request)`
- Naming: `Handle{Action}{Resource}` (e.g., `HandleGetPhotos`, `HandleUpload`)
- Structure: Parse/validate → Business logic → Response
- Use `utils.SendJSONResponse()` and `utils.SendErrorResponse()` for consistent responses, which also set `Content-Type: application/json`

## API Endpoints
- RESTful patterns with a trailing slash: `GET /api/resource/`, `POST /api/resource/`, `PUT /api/resource/{id}/`
- Routes are registered in `main.go` with `mux.HandleFunc("METHOD /path/", handler)`
- The frontend calls the same trailing-slash paths to avoid redirects

## Struct & Logging
- Descriptive names (e.g., `PhotoFile` not `Photo`), JSON tags, full words not abbreviations
- Use `slog` package with lowercase messages and key-value pairs

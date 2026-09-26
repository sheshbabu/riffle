# Database Guidelines

## Schema
Photos stored in `riffle.db` (SQLite) with EXIF metadata. Migrations are sequential SQL files in `./migrations/` with format `<version>_<title>.sql`.

**Main tables:** `photos`, `tags`, `photo_tags`, `albums`, `album_photos`, `import_sessions`, `imported_photos`, `export_sessions`, `exported_photos`

**Key photo fields:** `is_curated`, `is_trashed`, `rating` (0-5), `sha256_hash`, `dhash`, `thumbnail_path`, `notes`

## Query Patterns
- Use global `sqlite.DB` instance
- Always use parameterized queries with `?` placeholders
- Defer `rows.Close()` for multi-row queries
- Use transactions for multi-step operations with defer rollback pattern
- Model files (`*_model.go`) contain only database operations (Create*, Get*, Delete*)
- Keep utility/helper functions in feature files, not in model files
- Error pattern: `fmt.Errorf("error message: %w", err)` + `slog.Error(err.Error())`

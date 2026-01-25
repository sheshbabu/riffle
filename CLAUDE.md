# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Riffle is a photos organizer app for managing and deduplicating photo collections.

## Technology Stack

- Golang
- React
- SQLite (github.com/mattn/go-sqlite3) - Photo metadata storage
- go-exiftool (github.com/barasher/go-exiftool) - EXIF metadata extraction
- goheif (github.com/adrium/goheif) - HEIC/HEIF image format support
- goimagehash (github.com/corona10/goimagehash) - Perceptual image hashing for near-duplicate detection
- bimg (github.com/h2non/bimg) - Fast image processing with libvips
- golang.org/x/image - Image processing (resize, webp support)

## Development Commands

- `make build` - Build production binary
- `make dev` - Run development server
- `make watch` - Run with file watching (requires air)

## Workflow: Import → Curate → Library → Calendar → Settings → Export

### 1. Import (File Management)
- Point app at import folder (source files)
- Run exact duplicate detection using SHA256 hashing
- Move unique files and best candidates to Library folder
- Organize into `Year/Month` structure with renamed files
- Generate 300x300 thumbnails in `THUMBNAILS_PATH` (mirrors library structure)
- Assign photos to groups based on time/location clustering
- Store metadata in SQLite database

### 2. Curate (The Culling)
- Dedicated view shows only uncurated photos (`is_curated = false`)
- Keyboard shortcuts for fast review:
  - **P (Accept)**: Sets `is_curated=true, rating=0`
  - **X (Reject)**: Sets `is_curated=true, is_trashed=true`
  - **1-5 (Rate)**: Sets `is_curated=true, rating=1-5`
- Photos fade out with undo option after action
- Clear progress indication

### 3. Library (Organized Archive)
- Shows only curated, non-trashed photos (`is_curated=true AND is_trashed=false`)
- Masonry grid layout with responsive column sizing
- Group headers showing date range, location, photo count, and total size
- Filters by date range, rating, camera, and location
- Optimized pagination with efficient thumbnail loading

### 4. Trash (Safety Net)
- Virtual trash (files remain in library folder)
- Shows photos with `is_trashed=true`
- "Empty Trash" button (no-op for now)
- Future: Physical deletion or move to OS trash

### 5. Calendar
Month-by-month grid showing curated/uncurated counts and cover photos. Click to navigate to filtered library view.

### 6. Settings
Tabbed interface with multiple configuration panes:
- **Import**: Configure import folder, mode (move/copy), and view import history
- **Library**: Configure library and thumbnails folders, view storage statistics, rebuild thumbnails
- **Grouping**: Configure time gap (minutes), max duration (hours), and location distance (km) thresholds; rebuild groups
- **Burst**: Enable/disable burst detection, configure time window (seconds) and similarity threshold (dHash distance)
- **Export**: Configure export folder, organization options (maintain/flatten structure), duplicate handling (skip/include), and post-export cleanup (delete after export)

### 7. Export
Filter and export photos to local folder based on rating and curation status. Export sessions are tracked in the database with per-photo status logging. Supports:
- Filtering by minimum rating (0-5) and curation status (all photos or picked only)
- Organization options: maintain folder structure or flatten to single directory
- Duplicate handling: skip or include duplicate files based on SHA256 hash
- Cleanup option: delete original files from library after successful export
- Files are copied to the configured export folder with original timestamps preserved

### Photo Groups
Photos are automatically grouped during import using time-gap clustering and location-based analysis. Groups persisted in `photo_groups` table. Grouping parameters are configurable in Settings → Grouping.

**A new group starts when ANY of these conditions are met:**
- **Time gap** exceeds configured threshold (default: 120 minutes) between consecutive photos
- **Total group duration** exceeds configured maximum (default: 12 hours) to prevent multi-day groups
- **Distance** exceeds configured threshold (default: 1km) from the group's starting location (using Haversine distance)

Groups can be rebuilt from Settings → Grouping with custom parameters.

### Burst Detection
Photos taken within a configurable time window (default: 3 seconds) with dHash distance below a configurable similarity threshold (default: 4) are grouped as bursts. Display as collapsed stack with count badge; click to expand. Burst detection can be disabled or reconfigured in Settings → Burst, and existing bursts can be rebuilt with new parameters.

### Exact Duplicate Detection
- **SHA256 file hash** to identify exact duplicates
- **EXIF extraction** for all files to aid candidate selection
- **Duplicate handling**: Only the best candidate (prefers files with EXIF data) is moved to library; duplicates are left in the import folder for manual cleanup

### EXIF & Media Support
- **Key EXIF fields**: DateTime, GPS coordinates, camera make/model, dimensions, orientation, camera settings (ISO, aperture, shutter speed, focal length)
- **Supported formats**: Common image formats (JPG, PNG, HEIC, WebP, etc.) and video formats (MP4, MOV, AVI, etc.)

### Date Handling
- **Primary source**: EXIF DateTime fields (DateTimeOriginal, CreateDate, etc.)
- **Fallback**: File modification time if EXIF unavailable
- **Timestamp preservation**: Original file timestamps are captured and stored in database; modification time is restored after file moves using `os.Chtimes()`
- **Database fields**: `date_time` (EXIF, used for organization), `file_created_at`, `file_modified_at`, `created_at`, `imported_at`

### Folder Structure

**Import:**
- `IMPORT_PATH` - Source folder scanned recursively; files are moved or copied depending on settings, with cross-device support

**Library** (organized by date):
```
library/
  2025/
    01 - January/
      2025-01-15-143022-a4b8c16d32e6.jpg
      2025-01-20-091530-xyz789abcdef.jpg
  2024/
    12 - December/
      2024-12-25-180000-abc123def456.jpg
  Unknown/
    a4b8c16d32e64f12.jpg  (rare: only if date cannot be determined)
```

Files renamed as `YYYY-MM-DD-HHMMSS-<hash>.<ext>` (hash = first 16 chars of SHA256). Files without date go to `Unknown/`.

**Thumbnails:**
- `THUMBNAILS_PATH` - Pre-generated 300x300px JPEG thumbnails mirroring library structure
- Supports both image and video thumbnails

**Trash:**
- Virtual only (flagged with `is_trashed=true`); files remain in library folder

**Export:**
- `EXPORT_PATH` - Destination for filtered exports based on rating and curation criteria

### Photo Database

Photos stored in `riffle.db` (SQLite) with EXIF metadata.

**Main tables:** `photos`, `photo_groups`, `tags`, `photo_tags`, `albums`, `album_photos`, `import_sessions`, `imported_photos`, `export_sessions`, `exported_photos`

**Key photo fields:** `is_curated`, `is_trashed`, `rating` (0-5), `sha256_hash`, `dhash`, `thumbnail_path`, `group_id`, `notes`

**Key group fields:** `group_id`, `start_time`, `end_time`, `photo_count`, `total_size`, GPS coordinates, reverse geocoded location


## Architecture Overview

### Backend (Go)
- **Entry Point**: `main.go` - HTTP server, routes, and API handlers
- **Server Mode**: Web-based UI with API endpoints
- **Feature-based Structure**: Each feature has its own directory under `features/`
  - `ingest/` - Import workflow (scanning, deduplication, moving files)
  - `photos/` - Photo library management and serving
  - `calendar/` - Monthly overview and statistics
  - `settings/` - Application configuration and folder management
  - `geocoding/` - Reverse geocoding with offline GeoNames data
- **Commons**: Shared utilities in `commons/`
  - Backend: `exif/`, `hash/`, `media/`, `sqlite/`, `utils/`
  - Frontend: `http/` (ApiClient), `hooks/`, `components/` (Button, Modal, Lightbox, etc.)

### Frontend (React)
- **Entry Point**: `index.jsx` - Main app initialization
- **Component Structure**: JSX components using React
- **Build System**: esbuild bundles JSX to `assets/bundle.js`
- **State Management**: Local component state with hooks
- **Styling**: Plain CSS with CSS custom properties for theming
- **API Communication**: Centralized ApiClient with polling for async operations

### Key Patterns
- **API Routes**: RESTful endpoints prefixed with `/api/`
- **Background Processing**: Long-running tasks use goroutines with polling
- **Asset Handling**: Embedded in binary (`go:embed`) for production, file system for dev mode
- **Feature Structure**: Self-contained features with models and utilities

### Environment Variables
- `DEV_MODE`, `PORT` (default: 8080)
- `IMPORT_PATH`, `LIBRARY_PATH`, `THUMBNAILS_PATH`, `EXPORT_PATH`

## Development Conventions

### Code Style
- Keep code simple and readable
- Use descriptive variable names and consistent formatting
- Avoid complex language features unless necessary
- Prefer standard libraries over external dependencies
- Don't add unnecessary comments

### Go Backend Patterns

#### Error Handling
- Use error wrapping with context: `fmt.Errorf("context: %w", err)`
- Always log errors with `slog.Error()` before returning
- Handle `sql.ErrNoRows` separately using `errors.Is()`
- Use `panic()` only for critical initialization errors

#### HTTP Handlers
- Function signature: `func HandleXXX(w http.ResponseWriter, r *http.Request)`
- Naming: `Handle{Action}{Resource}` (e.g., `HandleGetPhotos`, `HandleUpload`)
- Structure: Parse/validate → Business logic → Response
- Set `Content-Type: application/json` for JSON responses

#### Database Patterns
- Use global `sqlite.DB` instance
- Always use parameterized queries with `?` placeholders
- Defer `rows.Close()` for multi-row queries
- Use transactions for multi-step operations with defer rollback pattern
- Model files (`*_model.go`) contain only database operations (Create*, Get*, Delete*)
- Keep utility/helper functions in feature files, not in model files
- Error pattern: `fmt.Errorf("error message: %w", err)` + `slog.Error(err.Error())`

#### Struct & Logging
- Descriptive names (e.g., `PhotoFile` not `Photo`), JSON tags, full words not abbreviations
- Use `slog` package with lowercase messages and key-value pairs

### React Frontend Patterns

#### Component Structure
- Use function components with hooks
- Main exported function/component should always be the top function
- Early returns for conditional rendering
- Default exports for components, named exports for utilities
- Extract logic from components into separate if-else conditions
- Extract map loops to variables outside JSX
- For conditional rendering, use if-else conditions outside JSX to build arrays/variables, not ternary operators or logical AND inside JSX
- Ternary operators in JSX are only acceptable for simple inline styles or class names
- Examples:
  ```javascript
  // Bad: logic mixed in JSX
  return (
    <div>
      {isProcessing ? 'Processing...' : 'Start'}
      {message && <div>{message}</div>}
    </div>
  );

  // Good: logic extracted before JSX
  const buttonText = isProcessing ? 'Processing...' : 'Start';

  let messageElement = null;
  if (message) {
    messageElement = <div>{message}</div>;
  }

  return (
    <div>
      {buttonText}
      {messageElement}
    </div>
  );
  ```

#### State & API
- Descriptive state names, local state with `useState`, functional updates for dependent state
- Centralized `ApiClient` with specific named methods, async/await pattern

#### Function Declarations
- Use `function` keyword for event handlers, utility functions, and render functions
- Use arrow functions only for inline callbacks in JSX
- Examples:
  ```javascript
  // Preferred: function declarations
  function handleSaveClick() { ... }
  function renderItems() { ... }

  // Acceptable: arrow functions for inline callbacks
  onClick={() => handleSaveClick()}
  items.map(item => ...)
  ```

#### Event Handling & CSS
- Handler naming: `handle{Action}Click` or `handle{Action}`, use `preventDefault()` for keyboard shortcuts
- BEM-like naming, conditional classes with template literals, use CSS variables for theming

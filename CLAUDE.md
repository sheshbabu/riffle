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
- golang.org/x/image - Image processing (resize, webp support)

## Development Commands

- `make build` - Build production binary
- `make dev` - Run development server
- `make watch` - Run with file watching (requires air)

## Implemented Features

### Core Workflow
1. Recursively scan "inbox" folder for media files (photos and videos)
2. Perform exact duplicate detection using SHA256 hashing
3. Extract EXIF metadata for selection criteria
4. Select best candidate from duplicates
5. Display summary statistics

### Exact Duplicate Detection
- **File size pre-filter** (performance optimization):
  - Group files by size first (cheap metadata read)
  - Only compute hashes for files in groups with 2+ members
- **SHA256 file hash** to identify exact duplicates
- **EXIF extraction** for all files to aid candidate selection

### Candidate Selection Strategy
When multiple files share the same hash (exact duplicates), select one to keep:
1. **Has EXIF data** - prefer files with EXIF metadata (likely originals)
2. **If tie** - pick first (they're byte-for-byte identical anyway)

### EXIF Fields Extracted
- **DateTime** - When photo/video was taken (checks multiple fields in priority order):
  - Photos: `DateTimeOriginal`
  - Videos: `CreateDate`, `MediaCreateDate`, `TrackCreateDate`, `CreationDate`
- **Make/Model** - Camera manufacturer and model
- **Width/Height** - Image dimensions
- **Latitude/Longitude** - GPS coordinates
- **Orientation** - Image rotation
- **Software** - Editing software (if edited)
- **ISO** - ISO speed rating
- **FNumber** - Aperture setting
- **ExposureTime** - Shutter speed
- **FocalLength** - Lens focal length
- **Flash** - Flash usage
- **ColorSpace** - Color space (sRGB, AdobeRGB)

### Media File Support
**Images:** .jpg, .jpeg, .png, .gif, .heic, .heif, .webp, .bmp, .tiff, .tif
**Videos:** .mp4, .mov, .avi, .mkv, .wmv, .flv, .webm, .m4v, .mpg, .mpeg

### Date Handling
- **Primary source**: EXIF DateTime fields (DateTimeOriginal, CreateDate, etc.)
- **Fallback**: File modification time (ModTime) if EXIF DateTime is unavailable
- Files are organized by date from either source

### Known Limitations
- **Scanned photos**: When physical photos are scanned, the scan date often gets written to `DateTimeOriginal` instead of the original photo date. These files will be organized by scan date rather than the actual photo date.

### Folder Structure

**Inbox:**
- `inbox/` - Source folder (scanned recursively)

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

Files are renamed using pattern: `YYYY-MM-DD-HHMMSS-<hash>.<ext>`
- Date/time from EXIF DateTime field (preferred) or file modification time (fallback)
- Hash is first 16 characters of SHA256 file hash
- Files without any date information go to `Unknown/` folder

**Trash** (organized by date):
- Same folder structure as library (`YYYY/MM - MonthName/`)
- Files renamed with same pattern as library

### Photo Database

Photos moved to library are stored in `riffle.db` with EXIF metadata for tagging, albums, and curation.

**Tables:** photos, tags, photo_tags, albums, album_photos

**Key Features:**
- Tag photos (screenshot, needs-rotation, portraits, etc.)
- Organize into albums
- Track sha256_hash and dhash (for duplicate/near-duplicate detection)
- Mark curated status, quality scores, add notes
- Search by date, camera, location, format

## Future Tasks

### Near Duplicate Detection
- Use **dhash** (difference hash) algorithm to find visually similar photos
- Present near duplicate groups to the user
- Interactive selection interface:
  - Show all near duplicate groups
  - Display EXIF metadata for each photo (timestamp, camera model, resolution, GPS coordinates)
  - Allow user to select which photo(s) to keep from each group
  - Support "select all" option
  - Auto-suggest candidates based on EXIF completeness and quality metrics
- Move selected photos to library
- Move unselected photos to trash

## Architecture Overview

### Backend (Go)
- **Entry Point**: `main.go` - HTTP server, routes, and API handlers
- **Server Mode**: Web-based UI with API endpoints
- **Feature-based Structure**: Each feature has its own directory under `features/`
  - `dedupe/` - Core deduplication logic (scanning, hashing, grouping, candidate selection)
- **Commons**: Shared utilities in `commons/`
  - `exif/` - EXIF data extraction and validation
  - `http/` - API client for frontend communication

### Frontend (React)
- **Entry Point**: `index.jsx` - Main app initialization
- **Component Structure**: JSX components using React
- **Build System**: esbuild bundles JSX to `assets/bundle.js`
- **State Management**: Local component state with hooks
- **Styling**: Plain CSS with CSS custom properties for theming
- **API Communication**: Centralized ApiClient with polling for async operations

### Key Patterns
- **Server-based**: Web UI for folder selection and deduplication control
- **API Routes**: RESTful endpoints prefixed with `/api/`
- **Background Processing**: Deduplication runs in goroutine, results written to temp file
- **Polling**: Frontend polls for results every 2 seconds until completion
- **Feature Structure**: Features are self-contained with models and utilities
- **Single Binary**: Assets embedded in binary for production, file system for development
- **Asset Handling**: Static assets embedded in binary (`go:embed`), dev mode serves from disk

### Environment Variables
- `DEV_MODE=true` - Development mode with file system assets
- `PORT` - Server port (default: 8080)

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

#### Struct Conventions
- Use descriptive names (e.g., `PhotoFile` not `Photo`)
- Use JSON tags for API responses: `json:"fieldName"`
- Use full words, not abbreviations (e.g., `libraryPath` not `libPath`)

#### Logging
- Use structured logging with `slog` package
- Log messages are lowercase
- Include context with key-value pairs: `slog.Info("message", "key", value)`
- Example: `slog.Error("failed to compute hash", "file", filePath, "error", err)`

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

#### State Management
- Use descriptive state names: `[photos, setPhotos]`, `[isLoading, setIsLoading]`
- Local state with `useState`, prop drilling for shared state
- Functional updates for state dependent on previous state

#### API Calls
- Use centralized `ApiClient` from `commons/http/ApiClient.js`
- Use specific named methods (e.g., `ApiClient.dedupe()`, `ApiClient.getDedupeResults()`)
- Async/await pattern for cleaner error handling
- Consistent error handling with user-facing messages

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

#### Event Handling
- Handler naming: `handle{Action}Click` or `handle{Action}` (e.g., `handleSaveClick`, `handleDedupe`)
- Keyboard shortcuts with `preventDefault()`

#### CSS Classes
- BEM-like naming: `photo-grid`, `toolbar-button`
- Conditional classes using template literals
- Minimal inline styles, prefer CSS classes
- Use CSS variables from `assets/index.css` for theming (`var(--spacing-6)`, `var(--neutral-200)`)

# Architecture

## Technology Stack
- Golang
- React
- SQLite (github.com/mattn/go-sqlite3) - Photo metadata storage
- go-exiftool (github.com/barasher/go-exiftool) - EXIF metadata extraction
- goheif (github.com/adrium/goheif) - HEIC/HEIF image format support
- goimagehash (github.com/corona10/goimagehash) - Perceptual image hashing for near-duplicate detection
- bimg (github.com/h2non/bimg) - Fast image processing with libvips
- golang.org/x/image - Image processing (resize, webp support)

## Backend (Go)
- **Entry Point**: `main.go` - HTTP server, routes, and API handlers
- **Server Mode**: Web-based UI with API endpoints
- **Feature-based Structure**: Each feature has its own directory under `features/`
  - `ingest/` - Import workflow (scanning, deduplication, moving files)
  - `photos/` - Photo library management and serving
  - `albums/` - User-defined photo collections
  - `calendar/` - Monthly overview and statistics
  - `stats/` - Analytics dashboard with bar charts
  - `export/` - Batch photo export with filtering
  - `settings/` - Application configuration and folder management
  - `geocoding/` - Reverse geocoding with offline GeoNames data
- **Commons**: Shared utilities in `commons/`
  - Backend: `exif/`, `hash/`, `media/`, `progress/`, `sqlite/`, `utils/`
  - Frontend: `http/` (ApiClient), `hooks/`, `components/` (Button, Modal, Lightbox, etc.)

## Frontend (React)
- **Entry Point**: `index.jsx` - Main app initialization
- **Component Structure**: JSX components using React
- **Build System**: esbuild bundles JSX to `assets/bundle.js`
- **State Management**: Local component state with hooks
- **Styling**: Plain CSS with CSS custom properties for theming
- **API Communication**: Centralized ApiClient with polling for async operations

## Key Patterns
- **API Routes**: RESTful endpoints prefixed with `/api/`
- **Background Processing**: Long-running tasks use goroutines with polling via `/api/operations/progress/`
- **Global Operation Lock**: Only one long-running operation (import, export, thumbnail rebuild, burst rebuild) can run at a time, managed by `commons/progress/` with mutex-based locking
- **Asset Handling**: Embedded in binary (`go:embed`) for production, file system for dev mode
- **Feature Structure**: Self-contained features with models and utilities

## Environment Variables
- `DEV_MODE`, `PORT` (default: 8080)
- `IMPORT_PATH`, `LIBRARY_PATH`, `THUMBNAILS_PATH`, `EXPORT_PATH`

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Riffle is a photos organizer app for managing and deduplicating photo collections.

## Technology Stack

- Go (Golang)
- Minimal external dependencies
- **go-exiftool** (github.com/barasher/go-exiftool) - EXIF metadata extraction for all media formats including HEIC

## Prerequisites

- **exiftool** binary must be installed:
  ```bash
  # macOS
  brew install exiftool

  # Linux
  apt-get install libimage-exiftool-perl
  ```

## Development Commands

### Build Commands
- `make build` - Build production binary
- `make dev` - Run development server
- `make watch` - Run with file watching (requires air)

### Dependencies
For watch mode development, install:
```bash
go install github.com/air-verse/air@latest
```

## Version 1.0 (Implemented)

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

### Command-Line Usage
```bash
riffle --inbox=<path> --library=<path> --trash=<path> [--dry-run=true]
```

**Flags:**
- `--inbox` - Path to inbox folder (required)
- `--library` - Path to library folder (required)
- `--trash` - Path to trash folder (required)
- `--dry-run` - Dry run mode (default: `true`)
  - `true` - Show what would be done without moving files
  - `false` - Actually move files

All three folder paths are required. Folders must exist before running.

**Safety:** Dry-run mode is enabled by default. Use `--dry-run=false` to actually move files.

### Known Limitations
- **Scanned photos**: When physical photos are scanned, the scan date often gets written to `DateTimeOriginal` instead of the original photo date. These files will be organized by scan date rather than the actual photo date.
- **Files without date metadata**: Photos downloaded from social media, screenshots, or edited photos may have stripped EXIF data and will go to the `Unknown/` folder.

### Summary Statistics
After completion, displays:
- Total files scanned
- Unique files found
- Duplicate groups identified
- Duplicates removed
- Files moved to library
- Files moved to trash

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
    a4b8c16d32e64f12.jpg
```

Files are renamed using pattern: `YYYY-MM-DD-HHMMSS-<hash>.<ext>`
- Date/time from EXIF DateTime field only
- Hash is first 16 characters of SHA256 file hash
- Files without EXIF DateTime go to `Unknown/` folder

**Trash** (organized by date):
- Same folder structure as library (`YYYY/MM - MonthName/`)
- Files renamed with same pattern as library

## Version 1.1

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

### Structure
- **Entry Point**: `main.go` - Command-line interface, directory validation, and orchestrates deduplication
- **Feature-based Structure**: Each feature has its own directory under `features/`
  - `dedupe/` - Core deduplication logic (Version 1.0)
    - `dedupe.go` - All deduplication logic (scanning, hashing, grouping, candidate selection)
- **Commons**: Shared utilities in `commons/`
  - `exif/` - EXIF data extraction and validation

### Key Patterns
- **CLI-based**: Command-line flags for folder paths (`--inbox`, `--library`, `--trash`)
- **Feature Structure**: Features are self-contained with models and utilities
- **Single Binary**: No external runtime dependencies

## Code Style Guidelines

### General
- Keep code simple and readable
- Use descriptive variable names and consistent formatting
- Avoid complex language features unless necessary
- Prefer standard libraries over external dependencies
- Don't add unnecessary comments

### Naming Conventions
- **Functions**: Use descriptive action names (e.g., `ComputeHash`, `SelectCandidate`, `ScanDirectory`)
- **Log Messages**: Lowercase with key-value pairs (e.g., `slog.Info("starting deduplication", "inbox", inboxPath)`)
- **Structs**: Clear, descriptive names (e.g., `PhotoFile` not `Photo`)
- **Variables**: Use full words, not abbreviations (e.g., `libraryPath` not `libPath`)

### Error Handling
- Use error wrapping with context: `fmt.Errorf("context: %w", err)`
- Always log errors with `slog.Error()` before returning
- Return errors to caller, don't panic except for initialization failures

### Logging
- Use structured logging with `slog` package
- Log messages are lowercase
- Include context with key-value pairs: `slog.Info("message", "key", value)`
- Example: `slog.Error("failed to compute hash", "file", filePath, "error", err)`

## Implementation Philosophy

Keep things simple and focused for Version 1.0.

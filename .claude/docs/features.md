# Features

## Workflow: Import → Curate → Library → Export

### 1. Import (File Management)
- Point app at import folder (source files)
- Run exact duplicate detection using SHA256 hashing
- Move unique files and best candidates to Library folder
- Organize into `Year/Month` structure with renamed files
- Generate 300x300 thumbnails in `THUMBNAILS_PATH` (mirrors library structure)
- Store metadata in SQLite database

### 2. Curate (The Culling)
- Dedicated view shows only uncurated photos (`is_curated = false`)
- Keyboard shortcuts for fast review (work in grid, lightbox, and compare mode):
  - **P (Accept)**: Sets `is_curated=true, rating=0`
  - **X (Reject)**: Sets `is_curated=true, is_trashed=true`
  - **U (Unflag)**: Resets curation state
  - **1-5 (Rate)**: Sets `is_curated=true, rating=1-5`
  - **C (Compare)**: Open side-by-side comparison mode
  - **Arrow keys**: Navigate grid; **Enter/Space**: Open lightbox
  - **I**: Toggle metadata panel in lightbox/compare mode
- Lightbox curation mode: full-screen review with action buttons, auto-advance to next photo, metadata display (camera, settings, GPS, location)
- Compare mode: side-by-side photo comparison for choosing between similar shots, with reference photo (left) and candidate photo (right), arrow key navigation, swap/promote actions
- Photos fade out with undo option after action
- Clear progress indication

### 3. Library (Organized Archive)
- Shows only curated, non-trashed photos (`is_curated=true AND is_trashed=false`)
- Masonry grid layout with responsive column sizing
- Group headers showing date, photo count, and total size
- Filters by date range, rating, camera, and location

### 4. Rejected (Safety Net)
- Rejected photos stay in the library folder
- Shows photos with `is_trashed=true`
- "Restore" (or P) picks the photo back into the Library
- "Remove from Disk" permanently deletes the file

### 5. Albums
- User-defined collections to organize and group photos
- Create, view, and manage albums
- Bulk add selected photos to albums

### 6. Calendar
Month-by-month grid showing curated/uncurated counts and cover photos. Click to navigate to filtered library view.

### 7. Stats
- Analytics dashboard showing photo collection statistics over time
- Stacked bar charts grouped by decade (1920s, 1930s, etc.)

### 8. Settings
Tabbed interface with multiple configuration panes:
- **Import**: Configure import folder, mode (move/copy), and view import history
- **Library**: Configure library and thumbnails folders, view storage statistics, rebuild thumbnails
- **Burst**: Enable/disable burst detection, configure time window (seconds) and similarity threshold (dHash distance)
- **Export**: Configure export folder, organization options (maintain/flatten structure), duplicate handling (skip/include), and post-export cleanup (delete after export)

### 9. Export
Filter and export photos to local folder based on rating and curation status. Export sessions are tracked in the database with per-photo status logging. Supports:
- Filtering by minimum rating (0-5) and curation status (all photos or picked only)
- Organization options: maintain folder structure or flatten to single directory
- Duplicate handling: skip or include duplicate files based on SHA256 hash
- Cleanup option: delete original files from library after successful export
- Files are copied to the configured export folder with original timestamps preserved

## Burst Detection
Photos taken within a configurable time window (default: 3 seconds) with dHash distance below a configurable similarity threshold (default: 4) are grouped as bursts. Display as collapsed stack with count badge; click to expand. Burst detection can be disabled or reconfigured in Settings → Burst, and existing bursts can be rebuilt with new parameters.

## Exact Duplicate Detection
- **SHA256 file hash** to identify exact duplicates
- **EXIF extraction** for all files to aid candidate selection
- **Duplicate handling**: Only the best candidate (prefers files with EXIF data) is moved to library; duplicates are left in the import folder for manual cleanup

## EXIF & Media Support
- **Key EXIF fields**: DateTime, GPS coordinates, camera make/model, dimensions, orientation, camera settings (ISO, aperture, shutter speed, focal length)
- **Supported formats**: Common image formats (JPG, PNG, HEIC, WebP, etc.) and video formats (MP4, MOV, AVI, etc.)

## Date Handling
- **Primary source**: EXIF DateTime fields (DateTimeOriginal, CreateDate, etc.)
- **Fallback**: File modification time if EXIF unavailable
- **Timestamp preservation**: Original file timestamps are captured and stored in database; modification time is restored after file moves using `os.Chtimes()`
- **Database fields**: `date_time` (EXIF, used for organization), `file_created_at`, `file_modified_at`, `created_at`, `imported_at`

## Folder Structure

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

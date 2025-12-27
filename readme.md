# Riffle

A photo organizer designed for photographers who need to efficiently manage and curate large photo collections.

### Workflow

```
Import → Curate → Library → Export
```

**Import**
* Exact duplicate detection using SHA256 hashing
* Smart candidate selection based on EXIF metadata
* Organizes photos by date into `YYYY/MM - MonthName/` folders
* Preserves EXIF metadata (DateTime, GPS, camera settings, video duration)
* Supports HEIC, HEIF, MOV, MP4, and common image formats

**Library**
* Browse organized photos in chronological grid
* Automatic photo grouping by time/location
* Photo metadata display (camera, settings, GPS)
* Image lightbox with full-screen view
* Video playback support
* On-the-fly image resizing and video thumbnails

**Curate** (Photo Culling Interface)
* Fast keyboard-driven review (P/X/1-5)
* Accept, reject, or rate photos quickly
* Visual progress tracking
* Undo with fade-out animations

**Trash** (Virtual Safety Net)
* Review rejected photos before final deletion
* No immediate file deletion
* Easy recovery of mistakenly rejected photos

### Installation

Install system dependencies:
```bash
# macOS
brew install exiftool ffmpeg libheif vips

# Linux
apt-get install libimage-exiftool-perl ffmpeg libheif-dev libvips-dev
```

Build from source:
```bash
$ make build
```

### Configuration

Create `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` and set your folder paths:
```
IMPORT_PATH=/path/to/import/folder
LIBRARY_PATH=/path/to/library
EXPORT_PATH=/path/to/export
```

### Usage

Start the server:
```bash
$ ./riffle
```

Open your browser to `http://localhost:8080`

### Development

Run development server with auto-reload:
```bash
$ make watch
```

Or run once:
```bash
$ make dev
```

### Reverse Geocoding

This project uses offline reverse geocoding with data from [GeoNames](http://download.geonames.org/export/dump/). Location data is stored locally for fast lookups without network requests.

Note that cities1000 dataset includes places with population > 1000, providing city-level accuracy.

### Vendor Dependencies

Download React:
```bash
curl -L -o assets/react.production.min.js https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js
curl -L -o assets/react-dom.production.min.js https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js
```

### Thanks
* [go-exiftool](https://github.com/barasher/go-exiftool) - EXIF metadata extraction
* [goimagehash](https://github.com/corona10/goimagehash) - Perceptual image hashing
* [goheif](https://github.com/adrium/goheif) - HEIC/HEIF format support
* [bimg](https://github.com/h2non/bimg) - Fast image processing with libvips

# Riffle

Photo organizer that deduplicates and organizes photos by date.

### Features
* Exact duplicate detection using SHA256 hashing
* Near duplicate detection using dhash (perceptual hashing) for visually similar images
* Smart candidate selection based on resolution, EXIF metadata, and file size
* Organizes photos by date into `YYYY/MM - MonthName/` folders
* Supports HEIC, MOV, MP4 and other formats
* Preserves EXIF metadata (DateTime, GPS, camera settings, video duration)
* Two-phase workflow: Analyze → Review → Execute
* Real-time progress with summary statistics
* Single Go binary with embedded assets

### Installation

Install system dependencies:
```bash
# macOS
brew install exiftool libheif

# Linux
apt-get install libimage-exiftool-perl libheif-dev
```

Build from source:
```bash
$ make build
```

### Usage

Start the server:
```bash
$ ./riffle
```

Open your browser to `http://localhost:8080`:

### Development

Run development server with auto-reload:
```bash
$ make watch
```

Or run once:
```bash
$ make dev
```

# Vendor Dependencies

Download React:
```bash
curl -L -o assets/react.production.min.js https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js
curl -L -o assets/react-dom.production.min.js https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js
```

### Thanks
* [go-exiftool](https://github.com/barasher/go-exiftool) - EXIF metadata extraction
* [goimagehash](https://github.com/corona10/goimagehash) - Perceptual image hashing
* [goheif](https://github.com/adrium/goheif) - HEIC/HEIF format support

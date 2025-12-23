# Riffle

Photo organizer that deduplicates and organizes photos by date.

### Features
* Exact duplicate detection using SHA256 hashing
* Organizes photos by date into `YYYY/MM - MonthName/` folders
* Supports HEIC, MOV, MP4 and other formats
* Preserves EXIF metadata
* Dry-run mode (safe preview before moving files)
* Real-time progress with summary statistics
* Single Go binary with embedded assets

### Installation

Install exiftool:
```bash
# macOS
brew install exiftool

# Linux
apt-get install libimage-exiftool-perl
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
* [go-exiftool](https://github.com/barasher/go-exiftool)

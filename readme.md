# Riffle

Photo organizer that deduplicates and organizes photos by date.

### Features
* Exact duplicate detection using SHA256 hashing
* Organizes photos by date into `YYYY/MM - MonthName/` folders
* Supports HEIC, MOV, MP4 and other formats
* Preserves EXIF metadata
* Dry-run mode (safe preview before moving files)
* Single Go binary with minimal dependencies

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
```bash
$ ./riffle --inbox=/path/to/inbox --library=/path/to/library --trash=/path/to/trash
```

By default runs in dry-run mode. To actually move files:
```bash
$ ./riffle --inbox=/path/to/inbox --library=/path/to/library --trash=/path/to/trash --dry-run=false
```

# Vendor Dependencies

Download React:
```bash
curl -L -o assets/react.production.min.js https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js
curl -L -o assets/react-dom.production.min.js https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js
```

### Thanks
* [go-exiftool](https://github.com/barasher/go-exiftool)

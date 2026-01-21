CREATE TABLE IF NOT EXISTS photo_groups (
    group_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time     TIMESTAMP NOT NULL,
    end_time       TIMESTAMP NOT NULL,
    photo_count    INTEGER DEFAULT 0,
    total_size     INTEGER DEFAULT 0,
    latitude       REAL,
    longitude      REAL,
    city           TEXT,
    state          TEXT,
    country_name   TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photos (
    file_path        TEXT PRIMARY KEY,
    original_filepath TEXT,
    sha256_hash      TEXT NOT NULL,
    dhash            TEXT,
    file_size        INTEGER NOT NULL,
    file_format      TEXT,
    mime_type        TEXT,
    is_video         BOOLEAN DEFAULT 0,
    duration         INTEGER,
    date_time        TIMESTAMP,
    camera_make      TEXT,
    camera_model     TEXT,
    width            INTEGER,
    height           INTEGER,
    orientation      INTEGER,
    latitude         REAL,
    longitude        REAL,
    iso              INTEGER,
    f_number         REAL,
    exposure_time    REAL,
    focal_length     REAL,
    city             TEXT,
    state            TEXT,
    country_name     TEXT,
    is_curated       BOOLEAN DEFAULT 0,
    is_trashed       BOOLEAN DEFAULT 0,
    rating           INTEGER DEFAULT 0,
    notes            TEXT,
    file_created_at  TIMESTAMP,
    file_modified_at TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    imported_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    thumbnail_path   TEXT,
    group_id         INTEGER REFERENCES photo_groups(group_id)
);

CREATE TABLE IF NOT EXISTS tags (
    tag_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photo_tags (
    file_path   TEXT NOT NULL,
    tag_id      INTEGER NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (file_path, tag_id),
    FOREIGN KEY (file_path) REFERENCES photos (file_path),
    FOREIGN KEY (tag_id) REFERENCES tags (tag_id)
);

CREATE TABLE IF NOT EXISTS albums (
    album_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS album_photos (
    album_id    INTEGER NOT NULL,
    file_path   TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, file_path),
    FOREIGN KEY (album_id) REFERENCES albums (album_id),
    FOREIGN KEY (file_path) REFERENCES photos (file_path)
);

CREATE TABLE IF NOT EXISTS import_sessions (
    import_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    import_path        TEXT NOT NULL,
    import_mode        TEXT NOT NULL,  -- "move" or "copy"
    started_at         TIMESTAMP NOT NULL,
    completed_at       TIMESTAMP,
    duration_seconds   INTEGER,
    total_scanned      INTEGER DEFAULT 0,
    already_imported   INTEGER DEFAULT 0,
    unique_files       INTEGER DEFAULT 0,
    duplicate_groups   INTEGER DEFAULT 0,
    duplicates_removed INTEGER DEFAULT 0,
    moved_to_library   INTEGER DEFAULT 0,
    skipped_photos     INTEGER DEFAULT 0,
    error_count        INTEGER DEFAULT 0,
    error_message      TEXT,
    status             TEXT NOT NULL,  -- "scanning", "hashing", "checking_imported", "finding_duplicates", "importing", "completed", "error"
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS imported_photos (
    import_id      INTEGER NOT NULL,
    file_path      TEXT NOT NULL,
    status         TEXT NOT NULL,  -- "success", "error", "skipped"
    error_message  TEXT,
    imported_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (import_id, file_path),
    FOREIGN KEY (import_id) REFERENCES import_sessions (import_id),
    FOREIGN KEY (file_path) REFERENCES photos (file_path)
);

CREATE TABLE IF NOT EXISTS export_sessions (
    export_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    export_path        TEXT NOT NULL,
    min_rating         INTEGER DEFAULT 0,
    curation_status    TEXT,  -- "all" or "pick"
    started_at         TIMESTAMP NOT NULL,
    completed_at       TIMESTAMP,
    duration_seconds   INTEGER,
    total_photos       INTEGER DEFAULT 0,
    exported_photos    INTEGER DEFAULT 0,
    skipped_photos     INTEGER DEFAULT 0,
    error_count        INTEGER DEFAULT 0,
    error_message      TEXT,
    status             TEXT NOT NULL,  -- "collecting", "exporting", "completed", "error"
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exported_photos (
    export_id      INTEGER NOT NULL,
    file_path      TEXT NOT NULL,
    status         TEXT NOT NULL,  -- "success", "error", "skipped"
    error_message  TEXT,
    exported_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (export_id, file_path),
    FOREIGN KEY (export_id) REFERENCES export_sessions (export_id),
    FOREIGN KEY (file_path) REFERENCES photos (file_path)
);

CREATE TABLE IF NOT EXISTS cities (
    geoname_id    INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    state         TEXT,
    country_code  TEXT NOT NULL,
    country_name  TEXT NOT NULL,
    latitude      REAL NOT NULL,
    longitude     REAL NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS cities_rtree USING rtree(
    id,
    min_lat, max_lat,
    min_lon, max_lon
);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('import_mode', 'copy'); -- "move", "copy"
INSERT OR IGNORE INTO settings (key, value) VALUES ('import_duplicate_handling', 'keep'); -- "keep", "delete"
INSERT OR IGNORE INTO settings (key, value) VALUES ('export_min_rating', '0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('export_curation_status', 'pick'); -- "all", "pick"

CREATE INDEX IF NOT EXISTS idx_photos_sha256_hash ON photos(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_photos_dhash ON photos(dhash);
CREATE INDEX IF NOT EXISTS idx_photos_date_time ON photos(date_time);
CREATE INDEX IF NOT EXISTS idx_photos_imported_at ON photos(imported_at);
CREATE INDEX IF NOT EXISTS idx_photos_is_curated ON photos(is_curated);
CREATE INDEX IF NOT EXISTS idx_photos_is_trashed ON photos(is_trashed);
CREATE INDEX IF NOT EXISTS idx_photos_rating ON photos(rating);
CREATE INDEX IF NOT EXISTS idx_photos_is_video ON photos(is_video);
CREATE INDEX IF NOT EXISTS idx_photos_camera ON photos(camera_make, camera_model);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_code);
CREATE INDEX IF NOT EXISTS idx_photos_group_id ON photos(group_id);
CREATE INDEX IF NOT EXISTS idx_photo_groups_start_time ON photo_groups(start_time);
CREATE INDEX IF NOT EXISTS idx_import_sessions_started_at ON import_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_imported_photos_import_id ON imported_photos(import_id);
CREATE INDEX IF NOT EXISTS idx_imported_photos_file_path ON imported_photos(file_path);
CREATE INDEX IF NOT EXISTS idx_imported_photos_status ON imported_photos(status);
CREATE INDEX IF NOT EXISTS idx_export_sessions_started_at ON export_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_export_sessions_status ON export_sessions(status);
CREATE INDEX IF NOT EXISTS idx_exported_photos_export_id ON exported_photos(export_id);
CREATE INDEX IF NOT EXISTS idx_exported_photos_file_path ON exported_photos(file_path);
CREATE INDEX IF NOT EXISTS idx_exported_photos_status ON exported_photos(status);

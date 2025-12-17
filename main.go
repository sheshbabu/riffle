package main

import (
	"flag"
	"fmt"
	"log/slog"
	"os"
	"riffle/commons/exif"
	"riffle/features/dedupe"
)

func main() {
	inboxPath := flag.String("inbox", "", "Path to inbox folder")
	libraryPath := flag.String("library", "", "Path to library folder")
	trashPath := flag.String("trash", "", "Path to trash folder")
	isDryRun := flag.Bool("dry-run", true, "Dry run mode (no files moved)")
	flag.Parse()

	defer exif.Close()

	if *inboxPath == "" || *libraryPath == "" || *trashPath == "" {
		slog.Error("all folder paths are required: --inbox, --library, --trash")
		flag.Usage()
		os.Exit(1)
	}

	slog.Info("riffle - photos organizer")
	slog.Info("configuration", "inbox", *inboxPath, "library", *libraryPath, "trash", *trashPath, "isDryRun", *isDryRun)

	if err := checkDirectories(*inboxPath, *libraryPath, *trashPath); err != nil {
		slog.Error("directory check failed", "error", err)
		os.Exit(1)
	}

	if err := dedupe.ProcessInbox(*inboxPath, *libraryPath, *trashPath, *isDryRun); err != nil {
		slog.Error("deduplication failed", "error", err)
		os.Exit(1)
	}

	slog.Info("deduplication completed successfully")
}

func checkDirectories(paths ...string) error {
	for _, path := range paths {
		info, err := os.Stat(path)
		if err != nil {
			if os.IsNotExist(err) {
				return fmt.Errorf("directory does not exist: %s", path)
			}
			return err
		}
		if !info.IsDir() {
			return fmt.Errorf("path is not a directory: %s", path)
		}
	}
	return nil
}

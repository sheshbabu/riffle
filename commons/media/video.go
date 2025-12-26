package media

import (
	"bytes"
	"fmt"
	"log/slog"
	"os/exec"
)

func GenerateVideoThumbnail(filePath string, maxWidth, maxHeight int) ([]byte, string, error) {
	timestamp := "00:00:01"

	cmd := exec.Command(
		"ffmpeg",
		"-ss", timestamp,
		"-i", filePath,
		"-vframes", "1",
		"-vf", fmt.Sprintf("scale='min(%d,iw)':min'(%d,ih)':force_original_aspect_ratio=decrease", maxWidth, maxHeight),
		"-f", "image2pipe",
		"-vcodec", "mjpeg",
		"-",
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		slog.Error("ffmpeg failed to generate video thumbnail", "file", filePath, "error", err, "stderr", stderr.String())
		return nil, "", fmt.Errorf("failed to generate video thumbnail: %w", err)
	}

	thumbnailData := stdout.Bytes()
	if len(thumbnailData) == 0 {
		return nil, "", fmt.Errorf("ffmpeg produced empty thumbnail")
	}

	return thumbnailData, "image/jpeg", nil
}

package media

import (
	"bytes"
	"fmt"
	"os/exec"
)

func GenerateVideoThumbnail(filePath string, maxWidth, maxHeight int) ([]byte, string, error) {
	cmd := exec.Command(
		"ffmpeg",
		"-i", filePath,
		"-vframes", "1", // Extract 1 frame
		"-vf", fmt.Sprintf("scale='min(%d,iw)':'min(%d,ih)':force_original_aspect_ratio=decrease", maxWidth, maxHeight), // Scale to max dimensions while preserving aspect ratio
		"-q:v", "2", // Better quality
		"-f", "image2pipe",
		"-an", // Disable audio processing
		"-loglevel", "error",
		"-",
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate video thumbnail for %s: %w: %s", filePath, err, stderr.String())
	}

	thumbnailData := stdout.Bytes()
	if len(thumbnailData) == 0 {
		return nil, "", fmt.Errorf("ffmpeg produced empty thumbnail")
	}

	return thumbnailData, "image/jpeg", nil
}

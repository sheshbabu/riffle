package utils

import (
	"strings"
	"testing"
	"time"
)

func TestNormalizeDateTime(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		exif           map[string]any
		expectedOutput string
	}{
		// Stage 1: Input already has timezone
		{
			name:           "RFC3339 format with positive offset converts to UTC",
			input:          "2023-06-15T10:30:45+05:30",
			exif:           map[string]any{},
			expectedOutput: "2023-06-15T05:00:45Z",
		},
		{
			name:           "Negative timezone offset converts correctly",
			input:          "2023-06-15 10:30:45-08:00",
			exif:           map[string]any{},
			expectedOutput: "2023-06-15T18:30:45Z",
		},
		{
			name:           "EXIF colon format with timezone",
			input:          "2023:06:15 10:30:45+02:00",
			exif:           map[string]any{},
			expectedOutput: "2023-06-15T08:30:45Z",
		},
		{
			name:           "Large positive offset crosses date boundary",
			input:          "2023-06-15 10:30:45+12:00",
			exif:           map[string]any{},
			expectedOutput: "2023-06-14T22:30:45Z",
		},

		// Stage 2: No timezone in input, use OffsetTimeOriginal from EXIF
		{
			name:           "Uses OffsetTimeOriginal positive offset",
			input:          "2023:06:15 10:30:45",
			exif:           map[string]any{"OffsetTimeOriginal": "+05:30"},
			expectedOutput: "2023-06-15T05:00:45Z",
		},
		{
			name:           "Uses OffsetTimeOriginal negative offset",
			input:          "2023-06-15 10:30:45",
			exif:           map[string]any{"OffsetTimeOriginal": "-08:00"},
			expectedOutput: "2023-06-15T18:30:45Z",
		},
		{
			name:           "Empty OffsetTimeOriginal falls back to local timezone",
			input:          "2023-06-15 10:30:45",
			exif:           map[string]any{"OffsetTimeOriginal": ""},
			expectedOutput: "Z", // Special marker for local timezone tests
		},
		{
			name:           "Non-string OffsetTimeOriginal ignored",
			input:          "2023:06:15 10:30:45",
			exif:           map[string]any{"OffsetTimeOriginal": 123},
			expectedOutput: "Z",
		},

		// Stage 3: No timezone, calculate from GPSDateTime
		{
			name:           "Calculates timezone offset from GPSDateTime",
			input:          "2023:06:15 10:30:45",
			exif:           map[string]any{"GPSDateTime": "2023:06:15 05:00:45Z"},
			expectedOutput: "2023-06-15T05:00:45Z",
		},
		{
			name:           "Non-string GPSDateTime ignored",
			input:          "2023:06:15 10:30:45",
			exif:           map[string]any{"GPSDateTime": 123},
			expectedOutput: "Z",
		},

		// Stage 4: Fallback to local timezone
		{
			name:           "Falls back to local timezone when no EXIF data",
			input:          "2023:06:15 10:30:45",
			exif:           map[string]any{},
			expectedOutput: "Z",
		},

		// Priority order
		{
			name:           "Input timezone takes priority over OffsetTimeOriginal",
			input:          "2023-06-15 10:30:45+02:00",
			exif:           map[string]any{"OffsetTimeOriginal": "+05:30"},
			expectedOutput: "2023-06-15T08:30:45Z",
		},
		{
			name:           "OffsetTimeOriginal takes priority over GPSDateTime",
			input:          "2023:06:15 10:30:45",
			exif:           map[string]any{
				"OffsetTimeOriginal": "+05:30",
				"GPSDateTime":        "2023:06:15 05:00:45Z",
			},
			expectedOutput: "2023-06-15T05:00:45Z",
		},

		// Invalid inputs
		{
			name:           "Unparseable datetime returned as-is",
			input:          "not-a-date",
			exif:           map[string]any{},
			expectedOutput: "not-a-date",
		},
		{
			name:           "Empty string returned as-is",
			input:          "",
			exif:           map[string]any{},
			expectedOutput: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actualOutput := NormalizeDateTime(tt.input, tt.exif)

			// For tests expecting local timezone fallback, just verify UTC format
			if tt.expectedOutput == "Z" {
				if !strings.HasSuffix(actualOutput, "Z") {
					t.Errorf("Expected UTC format ending in Z, got %q", actualOutput)
				}
				return
			}

			if actualOutput != tt.expectedOutput {
				t.Errorf("NormalizeDateTime(%q, %v)\nexpected: %q\nactual:   %q", tt.input, tt.exif, tt.expectedOutput, actualOutput)
			}
		})
	}
}

func TestNormalizeDateTime_RoundTrip(t *testing.T) {
	input := "2023-06-15T10:30:45+05:30"
	result := NormalizeDateTime(input, map[string]any{})

	parsedTime, err := time.Parse(time.RFC3339, result)
	if err != nil {
		t.Fatalf("Result should be valid RFC3339: %v", err)
	}

	if parsedTime.Location() != time.UTC {
		t.Errorf("Parsed time should be UTC, got %v", parsedTime.Location())
	}
}

func TestNormalizeDateTime_ChronologicalOrdering(t *testing.T) {
	// Verify the main use case: UTC conversion enables correct lexicographic sorting
	// India (20:09+05:30) is actually later than Singapore (20:34+08:00)
	indiaTime := NormalizeDateTime("2023-06-15 20:09:00+05:30", map[string]any{})
	singaporeTime := NormalizeDateTime("2023-06-15 20:34:00+08:00", map[string]any{})

	// After conversion: India = 14:39Z, Singapore = 12:34Z
	// String comparison: "2023-06-15T14:39:00Z" > "2023-06-15T12:34:00Z" ✓
	if indiaTime <= singaporeTime {
		t.Errorf("India time should be later than Singapore time after UTC conversion\nIndia:     %s\nSingapore: %s", indiaTime, singaporeTime)
	}
}

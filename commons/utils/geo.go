package utils

import (
	"regexp"
	"strconv"
)

var dmsRegex = regexp.MustCompile(`(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"\s*([NSEW])`)

func ParseDMSOrDecimal(s string) float64 {
	if val, err := strconv.ParseFloat(s, 64); err == nil {
		return val
	}

	matches := dmsRegex.FindStringSubmatch(s)
	if len(matches) != 5 {
		return 0
	}

	deg, _ := strconv.ParseFloat(matches[1], 64)
	min, _ := strconv.ParseFloat(matches[2], 64)
	sec, _ := strconv.ParseFloat(matches[3], 64)
	dir := matches[4]

	decimal := deg + min/60 + sec/3600

	if dir == "S" || dir == "W" {
		decimal = -decimal
	}

	return decimal
}

func ParseISO6709Coordinates(coords string) (latitude, longitude string) {
	// Pattern for ISO 6709: +/-latitude+/-longitude (optionally followed by altitude and /)
	// Examples: "+37.7749-122.4194/", "+37.7749-122.4194+10.5/"
	iso6709Pattern := regexp.MustCompile(`^([+-]?\d+\.?\d*)\s*([+-]\d+\.?\d*)`)
	if matches := iso6709Pattern.FindStringSubmatch(coords); len(matches) >= 3 {
		return matches[1], matches[2]
	}

	// Pattern for "lat N/S, lon E/W" format (e.g., "37.7749 N, 122.4194 W")
	dmsPattern := regexp.MustCompile(`(\d+\.?\d*)\s*([NS]),?\s*(\d+\.?\d*)\s*([EW])`)
	if matches := dmsPattern.FindStringSubmatch(coords); len(matches) >= 5 {
		lat := matches[1]
		if matches[2] == "S" {
			lat = "-" + lat
		}
		lon := matches[3]
		if matches[4] == "W" {
			lon = "-" + lon
		}
		return lat, lon
	}

	return "", ""
}

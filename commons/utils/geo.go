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

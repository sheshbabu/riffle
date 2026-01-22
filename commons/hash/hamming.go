package hash

import (
	"fmt"
	"math/bits"
	"strconv"
)

func HammingDistance(dhash1, dhash2 string) (int, error) {
	hash1, err := strconv.ParseUint(dhash1, 16, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse dhash1: %w", err)
	}

	hash2, err := strconv.ParseUint(dhash2, 16, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse dhash2: %w", err)
	}

	xor := hash1 ^ hash2
	return bits.OnesCount64(xor), nil
}

package photos

import (
	"fmt"
	"math"
	"riffle/commons/hash"
)

type Burst struct {
	BurstID    string `json:"burstId"`
	StartIndex int    `json:"startIndex"`
	Count      int    `json:"count"`
	CoverIndex int    `json:"coverIndex"`
}

const (
	BurstTimeWindowSeconds = 3
	BurstDhashThreshold    = 4
)

func DetectBursts(photos []Photo) []Burst {
	if len(photos) < 2 {
		return []Burst{}
	}

	var bursts []Burst
	visited := make([]bool, len(photos))

	for i := 0; i < len(photos); i++ {
		if visited[i] {
			continue
		}

		if photos[i].Dhash == nil {
			continue
		}

		burstIndices := []int{i}
		visited[i] = true

		baseTime := parsePhotoDateTime(photos[i])
		if baseTime == nil {
			continue
		}

		for j := i + 1; j < len(photos); j++ {
			if visited[j] {
				continue
			}

			if photos[j].Dhash == nil {
				continue
			}

			photoTime := parsePhotoDateTime(photos[j])
			if photoTime == nil {
				continue
			}

			timeDiff := math.Abs(baseTime.Sub(*photoTime).Seconds())
			if timeDiff > BurstTimeWindowSeconds {
				break
			}

			distance, err := hash.HammingDistance(*photos[i].Dhash, *photos[j].Dhash)
			if err != nil {
				continue
			}

			if distance <= BurstDhashThreshold {
				burstIndices = append(burstIndices, j)
				visited[j] = true
			}
		}

		if len(burstIndices) >= 2 {
			bursts = append(bursts, Burst{
				BurstID:    fmt.Sprintf("burst-%d", len(bursts)+1),
				StartIndex: burstIndices[0],
				Count:      len(burstIndices),
				CoverIndex: burstIndices[0],
			})
		}
	}

	return bursts
}

package media

import "github.com/h2non/bimg"

/*
| Value | Practical Meaning            | Transformation Needed     |
| ----- | ---------------------------- | ------------------------- |
|   1   | Normal (Portrait)            | None                      |
|   2   | Mirrored Horizontal          | Flip Horizontal           |
|   3   | Upside Down                  | Rotate 180°               |
|   4   | Mirrored Vertical            | Flip Vertical             |
|   5   | Transpose (Mirrored + Side)  | Mirror H + Rotate 270° CW |
|   6   | Landscape (Clockwise)        | Rotate 90° CW             |
|   7   | Transverse (Mirrored + Side) | Mirror H + Rotate 90° CW  |
|   8   | Landscape (CCW)              | Rotate 270° CW            |

Note:
 - Depends on the camera sensor
 - Some are naturally vertical (phones) or horizontal (DSLRs)
*/

const (
	// Common
	OrientationPortrait       = 1
	OrientationUpsideDown     = 3
	OrientationLandscapeLeft  = 6 // Top of phone is on left
	OrientationLandscapeRight = 8 // Top of phone is on right

	// Flipped
	OrientationPortraitMirroredHorizontal       = 2
	OrientationPortraitMirroredVertical         = 4
	OrientationLandscapeRightMirroredHorizontal = 5
	OrientationLandscapeLeftMirroredHorizontal  = 7
)

func OrientationToAngle(orientation int) bimg.Angle {
	switch orientation {
	case OrientationUpsideDown:
		return bimg.D180
	case OrientationLandscapeLeft:
		return bimg.D90
	case OrientationLandscapeRight:
		return bimg.D270
	default:
		return bimg.D0
	}
}

func OrientationNeedsFlip(orientation int) bool {
	return orientation == OrientationPortraitMirroredHorizontal ||
		orientation == OrientationPortraitMirroredVertical ||
		orientation == OrientationLandscapeRightMirroredHorizontal ||
		orientation == OrientationLandscapeLeftMirroredHorizontal
}

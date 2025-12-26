package media

import "github.com/h2non/bimg"

// 1=normal, 2=flip-h, 3=180°, 4=flip-v, 5=transpose, 6=90°CW, 7=transverse, 8=90°CCW
func OrientationToAngle(orientation int) bimg.Angle {
	switch orientation {
	case 3, 4:
		return bimg.D180
	case 5, 6:
		return bimg.D90
	case 7, 8:
		return bimg.D270
	default:
		return bimg.D0
	}
}

func OrientationNeedsFlip(orientation int) bool {
	return orientation == 2 || orientation == 4 || orientation == 5 || orientation == 7
}

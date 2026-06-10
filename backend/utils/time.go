package utils

import (
	"time"
	_ "time/tzdata" // embed timezone data
)

var israelLocation *time.Location

func init() {
	loc, err := time.LoadLocation("Asia/Jerusalem")
	if err != nil {
		loc = time.FixedZone("Israel Time", 3*60*60)
	}
	israelLocation = loc
}

// Now returns the current time in Israel timezone
func Now() time.Time {
	return time.Now().In(israelLocation)
}

package handlers

import (
	"testing"
)

func TestValidateShiftTimes(t *testing.T) {
	tests := []struct {
		name          string
		date          string
		startTime     string
		endTime       string
		workDuration  string
		expectError   bool
	}{
		// 1. Date Format Validation
		{
			name:         "Valid Date",
			date:         "15/06/2026",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  false,
		},
		{
			name:         "Invalid Date Format - ISO",
			date:         "2026-06-15",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},
		{
			name:         "Invalid Date Format - Slashing format reversed",
			date:         "06/15/2026",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},
		{
			name:         "Invalid Date Format - Text",
			date:         "not-a-date",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},
		{
			name:         "Invalid Date - Day out of bounds",
			date:         "32/06/2026",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},
		{
			name:         "Invalid Date - Month out of bounds",
			date:         "15/13/2026",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},

		// 2. Year boundaries
		{
			name:         "Valid Date - Low boundary year 2000",
			date:         "01/01/2000",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  false,
		},
		{
			name:         "Valid Date - High boundary year 2100",
			date:         "31/12/2100",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  false,
		},
		{
			name:         "Invalid Date - Year too low",
			date:         "31/12/1999",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},
		{
			name:         "Invalid Date - Year too high",
			date:         "01/01/2101",
			startTime:    "08:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},

		// 3. Work Duration Bypass
		{
			name:         "Bypass validations if workDuration is present",
			date:         "15/06/2026",
			startTime:    "",
			endTime:      "",
			workDuration: "08:00",
			expectError:  false,
		},
		{
			name:         "Bypass validations if workDuration is present even with invalid times",
			date:         "15/06/2026",
			startTime:    "invalid-time",
			endTime:      "invalid-time",
			workDuration: "08:00",
			expectError:  false,
		},

		// 4. Start Time Validation
		{
			name:         "Invalid Start Time Format",
			date:         "15/06/2026",
			startTime:    "08:60",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},
		{
			name:         "Invalid Start Time Hours",
			date:         "15/06/2026",
			startTime:    "25:00",
			endTime:      "17:00",
			workDuration: "",
			expectError:  true,
		},

		// 5. End Time Validation
		{
			name:         "Invalid End Time Format",
			date:         "15/06/2026",
			startTime:    "08:00",
			endTime:      "17:99",
			workDuration: "",
			expectError:  true,
		},

		// 6. Chronological Order
		{
			name:         "Valid Chronological Order",
			date:         "15/06/2026",
			startTime:    "09:00",
			endTime:      "10:00",
			workDuration: "",
			expectError:  false,
		},
		{
			name:         "Invalid Chronological Order - Same start/end time",
			date:         "15/06/2026",
			startTime:    "09:00",
			endTime:      "09:00",
			workDuration: "",
			expectError:  true,
		},
		{
			name:         "Invalid Chronological Order - End before start",
			date:         "15/06/2026",
			startTime:    "09:00",
			endTime:      "08:00",
			workDuration: "",
			expectError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateShiftTimes(tt.date, tt.startTime, tt.endTime, tt.workDuration)
			if (err != nil) != tt.expectError {
				t.Errorf("validateShiftTimes(%q, %q, %q, %q) error = %v, expectError = %v",
					tt.date, tt.startTime, tt.endTime, tt.workDuration, err, tt.expectError)
			}
		})
	}
}

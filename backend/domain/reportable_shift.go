package domain

import "time"

// ReportableShift defines the common interface for all shift types.
type ReportableShift interface {
	ShiftDate() string

	ShiftType() string

	AssignedToPhone() string

	AssignedByPhone() string

	StartTimeValue() string

	EndTimeValue() string

	CalculateDuration() time.Duration

	Validate() error

	SetStatus(status string)

	ShiftStatus() string

	GetNotes() string

	GetID() uint

	GetWorkDuration() string

	GetReminderSent() bool
}

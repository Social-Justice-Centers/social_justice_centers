package domain

import "time"

// ReportableShift is the product interface of the Abstract Factory pattern for
// shifts.  All concrete shift types (RegularShift, FlexibleShift, etc.)
// implement this interface, allowing business logic to operate on shifts
// without knowing their concrete type.
//
// This interface coexists alongside models.Shift.  HTTP handlers continue to
// use models.Shift directly until the full migration is performed.
type ReportableShift interface {
	// ShiftDate returns the date of the shift in DD/MM/YYYY format.
	ShiftDate() string

	// ShiftType returns the kind of shift (e.g. "planned", "reported").
	ShiftType() string

	// AssignedToPhone returns the phone number of the employee this shift is
	// assigned to.
	AssignedToPhone() string

	// AssignedByPhone returns the phone number of the manager who assigned
	// this shift.
	AssignedByPhone() string

	// StartTimeValue returns the shift's start time.
	StartTimeValue() string

	// EndTimeValue returns the shift's end time.  An empty string means the
	// shift is still active (not yet clocked out).
	EndTimeValue() string

	// CalculateDuration computes the effective work duration between start
	// and end times.  Returns zero if the shift has not ended yet or if
	// either time is unparseable.
	CalculateDuration() time.Duration

	// Validate checks all business rules that apply to this shift type and
	// returns an error describing any violation.  Returns nil when valid.
	Validate() error

	// SetStatus updates the approval status of the shift.
	SetStatus(status string)

	// ShiftStatus returns the approval status of the shift
	// (e.g. "approved", "pending").
	ShiftStatus() string

	// GetNotes returns any free-text notes attached to the shift.
	GetNotes() string

	// GetID returns the database identifier for the shift.
	GetID() uint

	// GetWorkDuration returns the raw persisted work duration string.
	GetWorkDuration() string

	// GetReminderSent returns whether a reminder has been sent for this shift.
	GetReminderSent() bool
}

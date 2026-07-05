package domain

import (
	"fmt"
	"time"
)

// RegularShift represents a standard fixed-hours shift.  It is designed for
// employees working the "regular" (IsRegularModel) schedule — typically
// fixed start/end times within the same day.
//
// This struct coexists alongside models.Shift.  HTTP handlers continue to
// use models.Shift directly until the full migration is performed.
type RegularShift struct {
	ID           uint   // Database primary key.
	AssignedTo   string // Phone of the employee.
	AssignedBy   string // Phone of the manager.
	Date         string // DD/MM/YYYY.
	StartTime    string // HH:MM (24-hour).
	EndTime      string // HH:MM (24-hour); empty if shift is still active.
	Notes        string
	Type         string // "planned" or "reported".
	Status       string // "approved" or "pending".
	ReminderSent bool
}

// ---------------------------------------------------------------------------
// ReportableShift implementation
// ---------------------------------------------------------------------------

func (s *RegularShift) ShiftDate() string       { return s.Date }
func (s *RegularShift) ShiftType() string        { return s.Type }
func (s *RegularShift) AssignedToPhone() string  { return s.AssignedTo }
func (s *RegularShift) AssignedByPhone() string  { return s.AssignedBy }
func (s *RegularShift) StartTimeValue() string   { return s.StartTime }
func (s *RegularShift) EndTimeValue() string     { return s.EndTime }
func (s *RegularShift) ShiftStatus() string      { return s.Status }
func (s *RegularShift) GetNotes() string         { return s.Notes }

// CalculateDuration computes the elapsed work time between StartTime and
// EndTime using the HH:MM format.  Returns zero if the shift has not ended
// or if times cannot be parsed.
func (s *RegularShift) CalculateDuration() time.Duration {
	if s.StartTime == "" || s.EndTime == "" {
		return 0
	}
	start, err1 := time.Parse("15:04", s.StartTime)
	end, err2 := time.Parse("15:04", s.EndTime)
	if err1 != nil || err2 != nil {
		return 0
	}
	d := end.Sub(start)
	if d < 0 {
		// Handle overnight shifts by adding 24 hours.
		d += 24 * time.Hour
	}
	return d
}

// Validate enforces RegularShift business rules:
//   - AssignedTo, AssignedBy, Date, and StartTime must be non-empty.
//   - Type must be either "planned" or "reported".
func (s *RegularShift) Validate() error {
	if s.AssignedTo == "" {
		return fmt.Errorf("regular shift: AssignedTo is required")
	}
	if s.AssignedBy == "" {
		return fmt.Errorf("regular shift: AssignedBy is required")
	}
	if s.Date == "" {
		return fmt.Errorf("regular shift: Date is required")
	}
	if s.StartTime == "" {
		return fmt.Errorf("regular shift: StartTime is required")
	}
	if s.Type != "planned" && s.Type != "reported" {
		return fmt.Errorf("regular shift: Type must be \"planned\" or \"reported\", got %q", s.Type)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Saveable implementation
// ---------------------------------------------------------------------------

// TableName satisfies domain.Saveable and maps to the same table used by
// models.Shift.
func (s *RegularShift) TableName() string { return "shifts" }

// ---------------------------------------------------------------------------
// Stringer (debugging / logging)
// ---------------------------------------------------------------------------

func (s *RegularShift) String() string {
	return fmt.Sprintf("RegularShift{ID:%d, Date:%s, %s→%s, AssignedTo:%s}",
		s.ID, s.Date, s.StartTime, s.EndTime, s.AssignedTo)
}

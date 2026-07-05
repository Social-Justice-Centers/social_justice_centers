package domain

import (
	"fmt"
	"time"
)

// FlexibleShift represents a shift for employees on the "flexible"
// (IsFlexibleModel) schedule.  Unlike RegularShift, a flexible shift may have
// a looser time structure — the employee clocks in and out freely, and the
// total work duration is computed from those timestamps.
//
// This struct coexists alongside models.Shift.  HTTP handlers continue to
// use models.Shift directly until the full migration is performed.
type FlexibleShift struct {
	ID           uint   // Database primary key.
	AssignedTo   string // Phone of the employee.
	AssignedBy   string // Phone of the manager.
	Date         string // DD/MM/YYYY.
	StartTime    string // HH:MM (24-hour) — clock-in time.
	EndTime      string // HH:MM (24-hour) — clock-out time; empty if active.
	WorkDuration string // Persisted duration string (e.g. "4h30m"); may be empty.
	Notes        string
	Type         string // "planned" or "reported".
	Status       string // "approved" or "pending".
	ReminderSent bool
}

// ---------------------------------------------------------------------------
// ReportableShift implementation
// ---------------------------------------------------------------------------

func (s *FlexibleShift) ShiftDate() string       { return s.Date }
func (s *FlexibleShift) ShiftType() string        { return s.Type }
func (s *FlexibleShift) AssignedToPhone() string  { return s.AssignedTo }
func (s *FlexibleShift) AssignedByPhone() string  { return s.AssignedBy }
func (s *FlexibleShift) StartTimeValue() string   { return s.StartTime }
func (s *FlexibleShift) EndTimeValue() string     { return s.EndTime }
func (s *FlexibleShift) ShiftStatus() string      { return s.Status }
func (s *FlexibleShift) GetNotes() string         { return s.Notes }

// CalculateDuration computes the elapsed work time.  If a persisted
// WorkDuration is available it is preferred; otherwise the duration is
// derived from StartTime and EndTime.
func (s *FlexibleShift) CalculateDuration() time.Duration {
	// Prefer a pre-computed, persisted duration if present.
	if s.WorkDuration != "" {
		if d, err := time.ParseDuration(s.WorkDuration); err == nil {
			return d
		}
	}

	// Fall back to computing from start/end.
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
		d += 24 * time.Hour
	}
	return d
}

// Validate enforces FlexibleShift business rules:
//   - AssignedTo, AssignedBy, and Date must be non-empty.
//   - Type must be either "planned" or "reported".
//   - StartTime is NOT required at creation for flexible shifts (a planned
//     flexible shift may omit it).
func (s *FlexibleShift) Validate() error {
	if s.AssignedTo == "" {
		return fmt.Errorf("flexible shift: AssignedTo is required")
	}
	if s.AssignedBy == "" {
		return fmt.Errorf("flexible shift: AssignedBy is required")
	}
	if s.Date == "" {
		return fmt.Errorf("flexible shift: Date is required")
	}
	if s.Type != "planned" && s.Type != "reported" {
		return fmt.Errorf("flexible shift: Type must be \"planned\" or \"reported\", got %q", s.Type)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Saveable implementation
// ---------------------------------------------------------------------------

// TableName satisfies domain.Saveable and maps to the same table used by
// models.Shift.
func (s *FlexibleShift) TableName() string { return "shifts" }

// ---------------------------------------------------------------------------
// Stringer (debugging / logging)
// ---------------------------------------------------------------------------

func (s *FlexibleShift) String() string {
	return fmt.Sprintf("FlexibleShift{ID:%d, Date:%s, %s→%s, Duration:%s, AssignedTo:%s}",
		s.ID, s.Date, s.StartTime, s.EndTime, s.WorkDuration, s.AssignedTo)
}

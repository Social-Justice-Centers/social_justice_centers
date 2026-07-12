package domain

import (
	"fmt"
	"time"
)

// FlexibleShift represents a shift for employees on the flexible schedule.
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



func (s *FlexibleShift) ShiftDate() string       { return s.Date }
func (s *FlexibleShift) ShiftType() string        { return s.Type }
func (s *FlexibleShift) AssignedToPhone() string  { return s.AssignedTo }
func (s *FlexibleShift) AssignedByPhone() string  { return s.AssignedBy }
func (s *FlexibleShift) StartTimeValue() string   { return s.StartTime }
func (s *FlexibleShift) EndTimeValue() string     { return s.EndTime }
func (s *FlexibleShift) ShiftStatus() string      { return s.Status }
func (s *FlexibleShift) SetStatus(status string)  { s.Status = status }
func (s *FlexibleShift) GetNotes() string         { return s.Notes }
func (s *FlexibleShift) GetID() uint              { return s.ID }
func (s *FlexibleShift) GetWorkDuration() string  { return s.WorkDuration }
func (s *FlexibleShift) GetReminderSent() bool    { return s.ReminderSent }

// CalculateDuration computes the elapsed work time.
func (s *FlexibleShift) CalculateDuration() time.Duration {
	if s.WorkDuration != "" {
		if d, err := time.ParseDuration(s.WorkDuration); err == nil {
			return d
		}
		// Handle legacy string duration models
		switch s.WorkDuration {
		case "full", "one day":
			return 8 * time.Hour
		case "half", "half day":
			return 4 * time.Hour
		case "sick", "sick day":
			return 8 * time.Hour
		}
	}

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

// Validate enforces FlexibleShift business rules.
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

func (s *FlexibleShift) TableName() string { return "shifts" }



func (s *FlexibleShift) String() string {
	return fmt.Sprintf("FlexibleShift{ID:%d, Date:%s, %s→%s, Duration:%s, AssignedTo:%s}",
		s.ID, s.Date, s.StartTime, s.EndTime, s.WorkDuration, s.AssignedTo)
}

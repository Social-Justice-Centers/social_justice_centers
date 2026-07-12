package domain

import "fmt"

type Employee struct {
	ID              uint   // Database primary key (matches models.User.ID).
	FullName        string // Display name.
	Username        string // Display name (not unique).
	Phone           string // Unique login identifier.
	Email           string
	Birthday        string // DD/MM/YYYY.
	DirectManagerID uint   // DB ID of the manager User record.
	IsFlexibleModel bool
	IsRegularModel  bool
}

func (e *Employee) GetID() uint              { return e.ID }
func (e *Employee) GetFullName() string      { return e.FullName }
func (e *Employee) GetPhone() string         { return e.Phone }
func (e *Employee) GetRole() string          { return "employee" }
func (e *Employee) GetDirectManagerID() uint { return e.DirectManagerID }

// ReportOnShift records a shift for this employee.
func (e *Employee) ReportOnShift(_ ReportableShift) error {
	return nil
}

func (e *Employee) ExportShifts(maker *ReportMaker, rows []EmployeeReportRow, meta ReportMeta) ([]byte, error) {
	return maker.MakeReport(rows, meta)
}

func (e *Employee) SyncShiftToCalendar(calendar CalendarService, shift ReportableShift) error {
	return calendar.AddShiftToCalendar(shift)
}

func (e *Employee) TableName() string { return "users" }

func (e *Employee) String() string {
	return fmt.Sprintf("Employee{ID:%d, Name:%q, Phone:%q}", e.ID, e.FullName, e.Phone)
}

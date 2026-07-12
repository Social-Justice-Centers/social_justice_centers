package domain

// Employable is the interface for the employee hierarchy.
type Employable interface {
	GetID() uint

	GetFullName() string

	GetPhone() string

	GetRole() string

	ReportOnShift(shift ReportableShift) error

	GetDirectManagerID() uint

	ExportShifts(maker *ReportMaker, rows []EmployeeReportRow, meta ReportMeta) ([]byte, error)

	SyncShiftToCalendar(calendar CalendarService, shift ReportableShift) error
}

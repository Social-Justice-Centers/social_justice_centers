package domain

// CalendarService is the interface for calendar integration.
type CalendarService interface {
	AddShiftToCalendar(shift ReportableShift) error

	RemoveShiftFromCalendar(shift ReportableShift) error

	UpdateShiftInCalendar(shift ReportableShift) error
}

package domain

// CalendarService is the target interface of the Adapter pattern for calendar
// integration.  Any external calendar provider (Google Calendar, Outlook,
// Apple Calendar, etc.) is wrapped by a concrete adapter that implements this
// interface, allowing the domain layer to schedule shifts without coupling to
// a specific vendor API.
type CalendarService interface {
	// AddShiftToCalendar creates a calendar event corresponding to the given
	// shift.  The adapter translates the domain shift data into the format
	// expected by the external calendar API.
	AddShiftToCalendar(shift ReportableShift) error

	// RemoveShiftFromCalendar cancels / deletes the calendar event that
	// corresponds to the given shift.  Implementations should be idempotent
	// (no error if the event does not exist).
	RemoveShiftFromCalendar(shift ReportableShift) error

	// UpdateShiftInCalendar modifies an existing calendar event to reflect
	// changes in the shift (e.g. rescheduled time, different assignee).
	UpdateShiftInCalendar(shift ReportableShift) error
}

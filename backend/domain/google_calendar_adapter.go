package domain

import (
	"fmt"
	"log"
)

// GoogleCalendarAdapter is a concrete Adapter that implements CalendarService
// by translating domain shift operations into Google Calendar API calls.
//
// CURRENT STATUS — STUB:
// No Google Calendar API client exists in this codebase yet.  This adapter
// provides the correct structural skeleton and logs all operations.  When the
// Google Calendar Go client library (google.golang.org/api/calendar/v3) is
// added as a dependency, the TODO placeholders below should be replaced with
// real API calls using the stored credentials.
//
// The adapter pattern ensures that swapping in the real implementation later
// will not require changes to any domain or handler code — only this file
// needs to be updated.
type GoogleCalendarAdapter struct {
	// CalendarID is the Google Calendar identifier to which events are
	// written (e.g. "primary" or a specific calendar ID string).
	CalendarID string
}

// NewGoogleCalendarAdapter creates an adapter configured for the given
// calendar.  Pass "primary" to target the authenticated user's default
// calendar.
func NewGoogleCalendarAdapter(calendarID string) CalendarService {
	return &GoogleCalendarAdapter{CalendarID: calendarID}
}

// AddShiftToCalendar creates a Google Calendar event for the shift.
//
// TODO: Replace the stub with a real Google Calendar API insert call once
// the google.golang.org/api/calendar/v3 dependency is available.
func (g *GoogleCalendarAdapter) AddShiftToCalendar(shift ReportableShift) error {
	if shift == nil {
		return fmt.Errorf("google calendar adapter: cannot add nil shift")
	}
	log.Printf("GoogleCalendarAdapter: [STUB] AddShiftToCalendar — "+
		"calendar=%s, date=%s, type=%s, assignedTo=%s, start=%s, end=%s",
		g.CalendarID, shift.ShiftDate(), shift.ShiftType(),
		shift.AssignedToPhone(), shift.StartTimeValue(), shift.EndTimeValue())
	// TODO: build calendar.Event and call service.Events.Insert(g.CalendarID, event).Do()
	return nil
}

// RemoveShiftFromCalendar deletes the Google Calendar event for the shift.
//
// TODO: Replace the stub with a real Google Calendar API delete call.
func (g *GoogleCalendarAdapter) RemoveShiftFromCalendar(shift ReportableShift) error {
	if shift == nil {
		return fmt.Errorf("google calendar adapter: cannot remove nil shift")
	}
	log.Printf("GoogleCalendarAdapter: [STUB] RemoveShiftFromCalendar — "+
		"calendar=%s, date=%s, assignedTo=%s",
		g.CalendarID, shift.ShiftDate(), shift.AssignedToPhone())
	// TODO: derive eventID from shift and call service.Events.Delete(g.CalendarID, eventID).Do()
	return nil
}

// UpdateShiftInCalendar updates the Google Calendar event for the shift.
//
// TODO: Replace the stub with a real Google Calendar API update call.
func (g *GoogleCalendarAdapter) UpdateShiftInCalendar(shift ReportableShift) error {
	if shift == nil {
		return fmt.Errorf("google calendar adapter: cannot update nil shift")
	}
	log.Printf("GoogleCalendarAdapter: [STUB] UpdateShiftInCalendar — "+
		"calendar=%s, date=%s, assignedTo=%s, start=%s, end=%s",
		g.CalendarID, shift.ShiftDate(), shift.AssignedToPhone(),
		shift.StartTimeValue(), shift.EndTimeValue())
	// TODO: derive eventID from shift, build updated event, call service.Events.Update(...).Do()
	return nil
}

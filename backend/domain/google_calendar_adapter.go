package domain

import (
	"fmt"
	"log"
)

// GoogleCalendarAdapter implements CalendarService for Google Calendar (stub).
type GoogleCalendarAdapter struct {
	CalendarID string
}

// NewGoogleCalendarAdapter creates an adapter for the given calendar.
func NewGoogleCalendarAdapter(calendarID string) CalendarService {
	return &GoogleCalendarAdapter{CalendarID: calendarID}
}

// AddShiftToCalendar creates a Google Calendar event for the shift (stub).
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

// RemoveShiftFromCalendar deletes the Google Calendar event for the shift (stub).
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

// UpdateShiftInCalendar updates the Google Calendar event for the shift (stub).
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

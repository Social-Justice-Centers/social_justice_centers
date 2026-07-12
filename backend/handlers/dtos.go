package handlers

import (
	"my-backend/domain"
	"my-backend/models"
)

// UserDTO is the Data Transfer Object representing a User.
// Matches the JSON shape expected by the frontend.
type UserDTO struct {
	ID              uint        `json:"ID"`
	FullName        string      `json:"fullName"`
	Username        string      `json:"username"`
	Email           string      `json:"email"`
	Phone           string      `json:"phone"`
	Birthday        string      `json:"birthday"`
	Role            models.Role `json:"role"`
	DirectManager   uint        `json:"directManager"`
	IsFlexibleModel bool        `json:"isFlexibleModel"`
	IsRegularModel  bool        `json:"isRegularModel"`
}

// EmployableToDTO converts the Employable interface into a UserDTO.
func EmployableToDTO(emp domain.Employable) UserDTO {
	dto := UserDTO{
		ID:            emp.GetID(),
		FullName:      emp.GetFullName(),
		Phone:         emp.GetPhone(),
		Role:          models.Role(emp.GetRole()),
		DirectManager: emp.GetDirectManagerID(),
	}

	// Extract non-essential fields not in the Employable interface.
	switch e := emp.(type) {
	case *domain.Employee:
		dto.Username = e.Username
		dto.Email = e.Email
		dto.Birthday = e.Birthday
		dto.IsFlexibleModel = e.IsFlexibleModel
		dto.IsRegularModel = e.IsRegularModel
	case *domain.Manager:
		dto.Username = e.Username
		dto.Email = e.Email
		dto.Birthday = e.Birthday
		dto.IsFlexibleModel = e.IsFlexibleModel
		dto.IsRegularModel = e.IsRegularModel
	}

	return dto
}

// ShiftDTO is the Data Transfer Object representing a Shift.
type ShiftDTO struct {
	ID           uint   `json:"ID"`
	AssignedTo   string `json:"assignedTo"`
	AssignedBy   string `json:"assignedBy"`
	Date         string `json:"date"`
	StartTime    string `json:"startTime"`
	EndTime      string `json:"endTime"`
	WorkDuration string `json:"workDuration"`
	Notes        string `json:"notes"`
	Type         string `json:"type"`
	Status       string `json:"status"`
	ReminderSent bool   `json:"reminderSent"`
}

// ReportableShiftToDTO converts the domain.ReportableShift into a ShiftDTO.
func ReportableShiftToDTO(shift domain.ReportableShift) ShiftDTO {
	return ShiftDTO{
		ID:           shift.GetID(),
		AssignedTo:   shift.AssignedToPhone(),
		AssignedBy:   shift.AssignedByPhone(),
		Date:         shift.ShiftDate(),
		StartTime:    shift.StartTimeValue(),
		EndTime:      shift.EndTimeValue(),
		WorkDuration: shift.GetWorkDuration(),
		Notes:        shift.GetNotes(),
		Type:         shift.ShiftType(),
		Status:       shift.ShiftStatus(),
		ReminderSent: shift.GetReminderSent(),
	}
}

// ModelShiftToDomain converts a models.Shift into a domain.ReportableShift.
func ModelShiftToDomain(db domain.Registry, shift models.Shift) domain.ReportableShift {
	shiftType := "regular"
	user, err := db.Users().GetByPhone(shift.AssignedTo)
	if err == nil && user.IsFlexibleModel {
		shiftType = "flexible"
	}

	data := map[string]interface{}{
		"id":           shift.ID, // Note: ID needs to be supported in factory or manually set
		"assignedTo":   shift.AssignedTo,
		"assignedBy":   shift.AssignedBy,
		"date":         shift.Date,
		"startTime":    shift.StartTime,
		"endTime":      shift.EndTime,
		"workDuration": shift.WorkDuration,
		"notes":        shift.Notes,
		"type":         shift.Type,
		"status":       shift.Status,
		"reminderSent": shift.ReminderSent,
	}

	factory := domain.NewDefaultShiftFactory()
	// Ignore factory error for generic maps
	reportable, _ := factory.CreateShift(shiftType, data)
	return reportable
}

// ValidateDomainShift validates a models.Shift via the domain layer.
func ValidateDomainShift(db domain.Registry, shift models.Shift) error {
	domainShift := ModelShiftToDomain(db, shift)
	return domainShift.Validate()
}

// SyncDomainShift pushes the shift to the calendar adapter.
func SyncDomainShift(db domain.Registry, shift models.Shift) {
	user, err := db.Users().GetByPhone(shift.AssignedTo)
	if err != nil {
		return
	}
	domainShift := ModelShiftToDomain(db, shift)
	employable := domain.UserToEmployable(user)
	calendar := domain.NewGoogleCalendarAdapter("primary")
	_ = employable.SyncShiftToCalendar(calendar, domainShift)
}

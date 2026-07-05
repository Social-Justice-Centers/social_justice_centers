package handlers

import (
	"my-backend/domain"
	"my-backend/models"
)

// UserDTO is the Data Transfer Object representing a User.
// This struct exactly matches the JSON shape expected by the frontend,
// acting as an anti-corruption layer between the new domain architecture
// and the legacy HTTP contracts.
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

// EmployableToDTO converts the new domain.Employable interface into a UserDTO
// for JSON serialization back to the frontend.
func EmployableToDTO(emp domain.Employable) UserDTO {
	dto := UserDTO{
		ID:            emp.GetID(),
		FullName:      emp.GetFullName(),
		Phone:         emp.GetPhone(),
		Role:          models.Role(emp.GetRole()),
		DirectManager: emp.GetDirectManagerID(),
	}

	// Because Employable is an interface that omits certain non-essential fields,
	// we type-assert to extract the rest of the fields needed for the frontend.
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
// This struct exactly matches the JSON shape expected by the frontend from models.Shift.
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

// ReportableShiftToDTO converts the new domain.ReportableShift interface into a ShiftDTO
// for JSON serialization back to the frontend.
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

// ModelShiftToDomain converts a legacy models.Shift into a domain.ReportableShift
// using the domain.ShiftFactory. It determines the correct concrete type by
// inspecting the assigned user's model configuration.
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
	// Ignore error here because the factory handles generic maps well
	reportable, _ := factory.CreateShift(shiftType, data)
	return reportable
}

// ValidateDomainShift uses the domain layer to validate a models.Shift.
func ValidateDomainShift(db domain.Registry, shift models.Shift) error {
	domainShift := ModelShiftToDomain(db, shift)
	return domainShift.Validate()
}

// SyncDomainShift pushes the shift to the calendar adapter via the Employable interface.
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

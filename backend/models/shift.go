package models

import "gorm.io/gorm"

// Shift represents a shift assigned by a manager to an employee.
type Shift struct {
	gorm.Model
	AssignedTo   string `gorm:"not null" json:"assignedTo"`  // Username of the employee
	AssignedBy   string `gorm:"not null" json:"assignedBy"`  // Username of the manager
	Date         string `json:"date"`                        // Format: DD/MM/YYYY
	StartTime    string `json:"startTime"`
	EndTime      string `json:"endTime"`
	WorkDuration string `json:"workDuration"` // Reserved for future half/full day calculation
	Notes        string `json:"notes"`
	Type         string `json:"type"` // "planned" or "reported"
	Status       string `gorm:"default:'approved'" json:"status"` // "approved" or "pending"
}

package models

import "gorm.io/gorm"

// EmployeeManagerHistory tracks which manager was responsible for an employee
// during a specific date range. ManagerIndex and EmployeeIndex are the GORM
// primary-key IDs (uint) of the corresponding User records.
type EmployeeManagerHistory struct {
	gorm.Model
	EmployeeIndex uint    `gorm:"not null;index"   json:"employeeIndex"` // ID of the employee User record
	ManagerIndex  uint    `gorm:"not null;index"   json:"managerIndex"`  // ID of the manager User record
	StartDate     string  `gorm:"not null"         json:"startDate"`     // DD/MM/YYYY
	EndDate       *string `                        json:"endDate"`       // nil = currently active
}

package domain

import "my-backend/models"

// UserStore defines all database operations for Users.
// Phone is the unique identifier used throughout.
type UserStore interface {
	Create(user *models.User) error
	GetByPhone(phone string) (*models.User, error)
	GetByDirectManagerID(managerID uint) ([]models.User, error)
	GetAll() ([]models.User, error)
	ExistsByPhone(phone string) (bool, error)
	GetByID(id uint) (*models.User, error)
	Update(user *models.User) error
	GetByEmail(email string) (*models.User, error)
	Delete(id uint) error
}

// ShiftStore defines all database operations for Shifts.
type ShiftStore interface {
	Create(shift *models.Shift) error
	GetByAssignedTo(phone string) ([]models.Shift, error)
	// GetByAssignedToInDateRange returns shifts for an employee that fall within
	// [startDate, endDate]. endDate="" means "up to today" (open-ended).
	// Dates are in DD/MM/YYYY format.
	GetByAssignedToInDateRange(phone string, startDate string, endDate string) ([]models.Shift, error)
	Delete(id uint) error
	GetActiveShift(phone string) (*models.Shift, error)
	GetAllActiveShifts() ([]models.Shift, error)
	Update(shift *models.Shift) error
	GetByID(id uint) (*models.Shift, error)
}

// DrivingReportStore defines all database operations for DrivingReports.
type DrivingReportStore interface {
	Create(report *models.DrivingReport) error
	GetByID(id uint) (*models.DrivingReport, error)
	GetByUserPhone(phone string) ([]models.DrivingReport, error)
	GetByUserPhones(phones []string) ([]models.DrivingReport, error)
	Approve(id uint, managerPhone string) error
	Update(report *models.DrivingReport) error
}

// EmployeeManagerHistoryStore manages the employee↔manager assignment history.
type EmployeeManagerHistoryStore interface {
	Create(record *models.EmployeeManagerHistory) error
	// GetActiveByEmployee returns the currently-active (EndDate == nil) record for an employee.
	GetActiveByEmployee(employeeID uint) (*models.EmployeeManagerHistory, error)
	// CloseActiveRecord sets EndDate on the active record for an employee.
	CloseActiveRecord(employeeID uint, endDate string) error
	// GetHistoryByManager returns all history records where ManagerIndex = managerID.
	GetHistoryByManager(managerID uint) ([]models.EmployeeManagerHistory, error)
}

// Registry is the central interface combining all stores.
// Swap the underlying implementation without changing business logic.
type Registry interface {
	Users() UserStore
	Shifts() ShiftStore
	DrivingReports() DrivingReportStore
	EmployeeManagerHistories() EmployeeManagerHistoryStore
}
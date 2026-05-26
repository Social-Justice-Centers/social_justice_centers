package domain

import "my-backend/models"

// UserStore defines all database operations for Users.
// Phone is the unique identifier used throughout.
type UserStore interface {
	Create(user *models.User) error
	GetByPhone(phone string) (*models.User, error)
	GetByDirectManager(managerPhone string) ([]models.User, error)
	GetAll() ([]models.User, error)
	ExistsByPhone(phone string) (bool, error)
}

// ShiftStore defines all database operations for Shifts.
type ShiftStore interface {
	Create(shift *models.Shift) error
	GetByAssignedTo(phone string) ([]models.Shift, error)
	GetByAssignedBy(managerPhone string) ([]models.Shift, error)
	Delete(id uint) error
	GetActiveShift(phone string) (*models.Shift, error)
	Update(shift *models.Shift) error
}

// DrivingReportStore defines all database operations for DrivingReports.
type DrivingReportStore interface {
	Create(report *models.DrivingReport) error
	GetByID(id uint) (*models.DrivingReport, error)
	GetByUserPhone(phone string) ([]models.DrivingReport, error)
	GetByUserPhones(phones []string) ([]models.DrivingReport, error)
	Approve(id uint, managerPhone string) error
}

// Registry is the central interface combining all stores.
// Swap the underlying implementation without changing business logic.
type Registry interface {
	Users() UserStore
	Shifts() ShiftStore
	DrivingReports() DrivingReportStore
}
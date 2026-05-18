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

// Registry is the central interface combining all stores.
// Swap the underlying implementation without changing business logic.
type Registry interface {
	Users() UserStore
	Shifts() ShiftStore
}
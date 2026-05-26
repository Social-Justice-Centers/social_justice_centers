package storage

import (
	"my-backend/domain"
	"my-backend/models"

	"gorm.io/gorm"
)

// sqliteRegistry implements domain.Registry backed by any gorm-compatible DB.
type sqliteRegistry struct {
	db *gorm.DB
}

// NewSQLiteRegistry creates a new Registry backed by the provided gorm DB.
func NewSQLiteRegistry(db *gorm.DB) domain.Registry {
	return &sqliteRegistry{db: db}
}

func (r *sqliteRegistry) Users() domain.UserStore                  { return &userStore{db: r.db} }
func (r *sqliteRegistry) Shifts() domain.ShiftStore                { return &shiftStore{db: r.db} }
func (r *sqliteRegistry) DrivingReports() domain.DrivingReportStore { return &drivingReportStore{db: r.db} }

// --- User Store Implementation ---

type userStore struct{ db *gorm.DB }

func (s *userStore) Create(user *models.User) error {
	return s.db.Create(user).Error
}

func (s *userStore) GetByPhone(phone string) (*models.User, error) {
	var user models.User
	err := s.db.Where("phone = ?", phone).First(&user).Error
	return &user, err
}

func (s *userStore) GetByDirectManager(managerPhone string) ([]models.User, error) {
	var users []models.User
	err := s.db.Where("direct_manager = ?", managerPhone).Find(&users).Error
	return users, err
}

func (s *userStore) GetAll() ([]models.User, error) {
	var users []models.User
	err := s.db.Find(&users).Error
	return users, err
}

func (s *userStore) ExistsByPhone(phone string) (bool, error) {
	var count int64
	err := s.db.Model(&models.User{}).Where("phone = ?", phone).Count(&count).Error
	return count > 0, err
}

// --- Shift Store Implementation ---

type shiftStore struct{ db *gorm.DB }

func (s *shiftStore) Create(shift *models.Shift) error {
	return s.db.Create(shift).Error
}

func (s *shiftStore) GetByAssignedTo(phone string) ([]models.Shift, error) {
	var shifts []models.Shift
	err := s.db.Where("assigned_to = ?", phone).Find(&shifts).Error
	return shifts, err
}

func (s *shiftStore) GetByAssignedBy(managerPhone string) ([]models.Shift, error) {
	var shifts []models.Shift
	err := s.db.Where("assigned_by = ?", managerPhone).Find(&shifts).Error
	return shifts, err
}

func (s *shiftStore) Delete(id uint) error {
	return s.db.Delete(&models.Shift{}, id).Error
}

func (s *shiftStore) GetActiveShift(phone string) (*models.Shift, error) {
	var activeShift models.Shift
	err := s.db.Where("assigned_to = ? AND end_time = ?", phone, "").First(&activeShift).Error
	return &activeShift, err
}

func (s *shiftStore) Update(shift *models.Shift) error {
	return s.db.Save(shift).Error
}

// --- Driving Report Store Implementation ---

type drivingReportStore struct{ db *gorm.DB }

func (s *drivingReportStore) Create(report *models.DrivingReport) error {
	return s.db.Create(report).Error
}

func (s *drivingReportStore) GetByID(id uint) (*models.DrivingReport, error) {
	var r models.DrivingReport
	err := s.db.First(&r, id).Error
	return &r, err
}

func (s *drivingReportStore) GetByUserPhone(phone string) ([]models.DrivingReport, error) {
	var reports []models.DrivingReport
	err := s.db.Where("user_phone = ?", phone).Order("created_at desc").Find(&reports).Error
	return reports, err
}

func (s *drivingReportStore) GetByUserPhones(phones []string) ([]models.DrivingReport, error) {
	if len(phones) == 0 {
		return []models.DrivingReport{}, nil
	}
	var reports []models.DrivingReport
	err := s.db.Where("user_phone IN ?", phones).Order("created_at desc").Find(&reports).Error
	return reports, err
}

func (s *drivingReportStore) Approve(id uint, managerPhone string) error {
	return s.db.Model(&models.DrivingReport{}).Where("id = ?", id).Updates(map[string]interface{}{
		"approved":    true,
		"approved_by": managerPhone,
	}).Error
}

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

func (r *sqliteRegistry) Users() domain.UserStore { return &userStore{db: r.db} }
func (r *sqliteRegistry) Shifts() domain.ShiftStore { return &shiftStore{db: r.db} }
func (r *sqliteRegistry) DrivingReports() domain.DrivingReportStore {
	return &drivingReportStore{db: r.db}
}
func (r *sqliteRegistry) EmployeeManagerHistories() domain.EmployeeManagerHistoryStore {
	return &employeeManagerHistoryStore{db: r.db}
}

// =============================================================================
// User Store
// =============================================================================

type userStore struct{ db *gorm.DB }

func (s *userStore) Create(user *models.User) error {
	return s.db.Create(user).Error
}

func (s *userStore) GetByPhone(phone string) (*models.User, error) {
	var user models.User
	err := s.db.Where("phone = ?", phone).First(&user).Error
	return &user, err
}

func (s *userStore) GetByID(id uint) (*models.User, error) {
	var user models.User
	err := s.db.First(&user, id).Error
	return &user, err
}

// GetByDirectManagerID returns all employees whose DirectManager equals managerID.
func (s *userStore) GetByDirectManagerID(managerID uint) ([]models.User, error) {
	var users []models.User
	err := s.db.Where("direct_manager = ?", managerID).Find(&users).Error
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

func (s *userStore) Update(user *models.User) error {
	return s.db.Save(user).Error
}

func (s *userStore) GetByEmail(email string) (*models.User, error) {
	var user models.User
	err := s.db.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (s *userStore) Delete(id uint) error {
	return s.db.Delete(&models.User{}, id).Error
}

// =============================================================================
// Shift Store
// =============================================================================

type shiftStore struct{ db *gorm.DB }

func (s *shiftStore) Create(shift *models.Shift) error {
	return s.db.Create(shift).Error
}

func (s *shiftStore) GetByAssignedTo(phone string) ([]models.Shift, error) {
	var shifts []models.Shift
	err := s.db.Where("assigned_to = ?", phone).Find(&shifts).Error
	return shifts, err
}

// GetByAssignedToInDateRange returns shifts for a given employee whose date falls
// within [startDate, endDate] (DD/MM/YYYY).  When endDate is "", the range is
// open-ended (start_date onward, i.e. no upper bound).
//
// SQLite stores dates as DD/MM/YYYY text, so we convert them to YYYY-MM-DD for
// reliable lexicographic comparison using SQLite's substr helpers.
func (s *shiftStore) GetByAssignedToInDateRange(phone, startDate, endDate string) ([]models.Shift, error) {
	var shifts []models.Shift

	// Convert DD/MM/YYYY → YYYY-MM-DD for SQLite text comparison.
	toISO := func(ddmmyyyy string) string {
		if len(ddmmyyyy) != 10 {
			return ddmmyyyy
		}
		return ddmmyyyy[6:10] + "-" + ddmmyyyy[3:5] + "-" + ddmmyyyy[0:2]
	}

	isoStart := toISO(startDate)

	query := s.db.Where("assigned_to = ?", phone).
		Where("substr(date,7,4)||'-'||substr(date,4,2)||'-'||substr(date,1,2) >= ?", isoStart)

	if endDate != "" {
		isoEnd := toISO(endDate)
		query = query.Where("substr(date,7,4)||'-'||substr(date,4,2)||'-'||substr(date,1,2) <= ?", isoEnd)
	}

	err := query.Find(&shifts).Error
	return shifts, err
}

func (s *shiftStore) Delete(id uint) error {
	return s.db.Delete(&models.Shift{}, id).Error
}

func (s *shiftStore) GetActiveShift(phone string) (*models.Shift, error) {
	var activeShift models.Shift
	err := s.db.Where("assigned_to = ? AND end_time = ? AND (work_duration = ? OR work_duration IS NULL)", phone, "", "").First(&activeShift).Error
	return &activeShift, err
}

func (s *shiftStore) Update(shift *models.Shift) error {
	return s.db.Save(shift).Error
}

func (s *shiftStore) GetByID(id uint) (*models.Shift, error) {
	var shift models.Shift
	err := s.db.First(&shift, id).Error
	return &shift, err
}

// =============================================================================
// Driving Report Store
// =============================================================================

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

// Update persists all editable fields of a DrivingReport.
func (s *drivingReportStore) Update(report *models.DrivingReport) error {
	return s.db.Save(report).Error
}

// =============================================================================
// Employee Manager History Store
// =============================================================================

type employeeManagerHistoryStore struct{ db *gorm.DB }

func (s *employeeManagerHistoryStore) Create(record *models.EmployeeManagerHistory) error {
	return s.db.Create(record).Error
}

// GetActiveByEmployee returns the active (EndDate IS NULL) record for the employee.
func (s *employeeManagerHistoryStore) GetActiveByEmployee(employeeID uint) (*models.EmployeeManagerHistory, error) {
	var record models.EmployeeManagerHistory
	err := s.db.Where("employee_index = ? AND end_date IS NULL", employeeID).First(&record).Error
	return &record, err
}

// CloseActiveRecord sets EndDate on the currently-active record for an employee.
func (s *employeeManagerHistoryStore) CloseActiveRecord(employeeID uint, endDate string) error {
	return s.db.Model(&models.EmployeeManagerHistory{}).
		Where("employee_index = ? AND end_date IS NULL", employeeID).
		Update("end_date", endDate).Error
}

// GetHistoryByManager returns all history rows where ManagerIndex = managerID.
func (s *employeeManagerHistoryStore) GetHistoryByManager(managerID uint) ([]models.EmployeeManagerHistory, error) {
	var records []models.EmployeeManagerHistory
	err := s.db.Where("manager_index = ?", managerID).Find(&records).Error
	return records, err
}

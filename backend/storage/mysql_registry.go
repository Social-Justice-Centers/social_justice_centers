package storage

import (
	"my-backend/domain"
	"my-backend/models"

	"gorm.io/gorm"
)

// mysqlRegistry implements domain.Registry and domain.DB backed by a MySQL
// database via GORM.
type mysqlRegistry struct {
	db *gorm.DB
}

// NewMySQLRegistry creates a new Registry backed by the provided GORM DB
// connected to a MySQL instance.
func NewMySQLRegistry(db *gorm.DB) domain.DB {
	return &mysqlRegistry{db: db}
}

// ---------------------------------------------------------------------------
// domain.DB implementation
// ---------------------------------------------------------------------------

// SaveToDB persists a Saveable entity using GORM's Save (upsert) semantics.
func (r *mysqlRegistry) SaveToDB(s domain.Saveable) error {
	return r.db.Save(s).Error
}

// Registry returns the mysqlRegistry itself, which also satisfies
// domain.Registry.
func (r *mysqlRegistry) Registry() domain.Registry {
	return r
}

// ---------------------------------------------------------------------------
// domain.Registry implementation
// ---------------------------------------------------------------------------

func (r *mysqlRegistry) Users() domain.UserStore { return &userStore{db: r.db} }
func (r *mysqlRegistry) Shifts() domain.ShiftStore { return &shiftStore{db: r.db} }
func (r *mysqlRegistry) DrivingReports() domain.DrivingReportStore {
	return &drivingReportStore{db: r.db}
}
func (r *mysqlRegistry) EmployeeManagerHistories() domain.EmployeeManagerHistoryStore {
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

// GetByAssignedToInDateRange returns shifts for a given employee whose date
// falls within [startDate, endDate] (DD/MM/YYYY).  When endDate is "", the
// range is open-ended (startDate onward, i.e. no upper bound).
//
// Dates are stored as DD/MM/YYYY text, so they are converted to YYYY-MM-DD
// for reliable lexicographic comparison using SQL substr helpers.
func (s *shiftStore) GetByAssignedToInDateRange(phone, startDate, endDate string) ([]models.Shift, error) {
	var shifts []models.Shift

	query := s.db.Where("assigned_to = ?", phone).
		Where("STR_TO_DATE(date, '%d/%m/%Y') >= STR_TO_DATE(?, '%d/%m/%Y')", startDate)

	if endDate != "" {
		query = query.Where("STR_TO_DATE(date, '%d/%m/%Y') <= STR_TO_DATE(?, '%d/%m/%Y')", endDate)
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

func (s *shiftStore) GetAllActiveShifts() ([]models.Shift, error) {
	var activeShifts []models.Shift
	err := s.db.Where("end_time = ? AND (work_duration = ? OR work_duration IS NULL)", "", "").Find(&activeShifts).Error
	return activeShifts, err
}

func (s *shiftStore) Update(shift *models.Shift) error {
	return s.db.Save(shift).Error
}

func (s *shiftStore) GetByID(id uint) (*models.Shift, error) {
	var shift models.Shift
	err := s.db.First(&shift, id).Error
	return &shift, err
}

func (s *shiftStore) GetAllPlannedShifts() ([]models.Shift, error) {
	var shifts []models.Shift
	err := s.db.Where("type = ? AND reminder_sent = ?", "planned", false).Find(&shifts).Error
	return shifts, err
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

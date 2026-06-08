package Initialization

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"my-backend/models"
)

// InitDB connects to the database, runs migrations, and seeds the default admin user.
func InitDB() *gorm.DB {
	_ = godotenv.Load()
	_ = godotenv.Load("../deploy/.env")

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "app.db"
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Shift{},
		&models.DrivingReport{},
		&models.EmployeeManagerHistory{},
	); err != nil {
		log.Fatal("Failed to auto-migrate schema:", err)
	}

	// Run migration for any legacy phone-based direct_manager fields
	migrateDirectManagerColumn(db)

	seedAdminUser(db)
	return db
}

// migrateDirectManagerColumn converts any legacy string phone numbers in the
// direct_manager column of the users table into the corresponding manager's uint ID.
func migrateDirectManagerColumn(db *gorm.DB) {
	var rawUsers []map[string]interface{}
	if err := db.Table("users").Find(&rawUsers).Error; err != nil {
		log.Printf("Migration: Failed to query users table: %v\n", err)
		return
	}

	// Map phone numbers to user ID indices
	phoneToID := make(map[string]uint)
	for _, ru := range rawUsers {
		var id uint
		if val, ok := ru["id"]; ok {
			switch v := val.(type) {
			case int64:
				id = uint(v)
			case float64:
				id = uint(v)
			case int:
				id = uint(v)
			}
		}
		var phone string
		if p, ok := ru["phone"].(string); ok {
			phone = p
		}
		if phone != "" && id != 0 {
			phoneToID[phone] = id
		}
	}

	// Check and migrate each user's direct_manager if it's stored as a phone string
	for _, ru := range rawUsers {
		var id uint
		if val, ok := ru["id"]; ok {
			switch v := val.(type) {
			case int64:
				id = uint(v)
			case float64:
				id = uint(v)
			case int:
				id = uint(v)
			}
		}

		dmVal, ok := ru["direct_manager"]
		if !ok || dmVal == nil {
			continue
		}

		dmStr := strings.TrimSpace(fmt.Sprintf("%v", dmVal))
		if dmStr == "" || dmStr == "0" {
			continue
		}

		// If direct_manager starts with '0' or is longer than 5 chars, it's likely a phone number
		if len(dmStr) > 5 && (strings.HasPrefix(dmStr, "0") || len(dmStr) >= 9) {
			if managerID, exists := phoneToID[dmStr]; exists {
				log.Printf("Migration: Converting user %d direct_manager from phone '%s' to ID %d\n", id, dmStr, managerID)
				if err := db.Table("users").Where("id = ?", id).Update("direct_manager", managerID).Error; err != nil {
					log.Printf("Migration error: %v\n", err)
				}

				// Generate legacy history record if not present
				var histCount int64
				db.Model(&models.EmployeeManagerHistory{}).
					Where("employee_index = ? AND manager_index = ?", id, managerID).
					Count(&histCount)
				if histCount == 0 {
					history := models.EmployeeManagerHistory{
						EmployeeIndex: id,
						ManagerIndex:  managerID,
						StartDate:     "01/05/2026", // default date for legacy relationship
						EndDate:       nil,
					}
					if err := db.Create(&history).Error; err != nil {
						log.Printf("Migration error creating history: %v\n", err)
					}
				}
			} else {
				log.Printf("Migration warning: Manager phone '%s' for user %d not found in DB\n", dmStr, id)
			}
		}
	}
}

// todayDDMMYYYY returns today's date in DD/MM/YYYY format.
func todayDDMMYYYY() string {
	return time.Now().Format("02/01/2006")
}

// seedAdminUser ensures the default admin exists on every startup.
// Credentials are pulled from environment variables — nothing is hardcoded.
func seedAdminUser(db *gorm.DB) {
	phone := os.Getenv("INITIAL_ADMIN_PHONE")
	password := os.Getenv("INITIAL_ADMIN_PASSWORD")
	username := os.Getenv("INITIAL_ADMIN_USERNAME")
	email := os.Getenv("INITIAL_ADMIN_EMAIL")
	birthday := os.Getenv("INITIAL_ADMIN_BIRTHDAY")

	if phone == "" || password == "" {
		log.Println("Info: Skipping admin seed — INITIAL_ADMIN_PHONE or INITIAL_ADMIN_PASSWORD not set")
		return
	}

	var count int64
	db.Model(&models.User{}).Where("phone = ?", phone).Count(&count)
	if count > 0 {
		return // Already exists
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		log.Printf("Error hashing admin password: %v\n", err)
		return
	}

	// Create admin with DirectManager = 0 initially; we'll update after we have the ID.
	admin := models.User{
		FullName:        "מנהל מערכת",
		Username:        username,
		Password:        string(hashed),
		Email:           email,
		Phone:           phone,
		Birthday:        birthday,
		Role:            models.RoleManager,
		DirectManager:   0, // placeholder; updated below
		IsFlexibleModel: true,
		IsRegularModel:  true,
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Printf("Error seeding admin user: %v\n", err)
		return
	}

	// Admin manages themselves — set DirectManager to their own DB ID
	if err := db.Model(&admin).Update("direct_manager", admin.ID).Error; err != nil {
		log.Printf("Error updating admin DirectManager: %v\n", err)
	}

	// Seed the initial history record: admin is their own manager from today
	history := models.EmployeeManagerHistory{
		EmployeeIndex: admin.ID,
		ManagerIndex:  admin.ID,
		StartDate:     todayDDMMYYYY(),
		EndDate:       nil,
	}
	if err := db.Create(&history).Error; err != nil {
		log.Printf("Error seeding admin history record: %v\n", err)
	} else {
		log.Println("SUCCESS: Default admin user seeded")
	}
}

// HashPassword hashes a plain-text password using bcrypt.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// CheckPasswordHash compares a plain password against its bcrypt hash.
func CheckPasswordHash(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

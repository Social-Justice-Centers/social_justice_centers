package Initialization

import (
	"log"
	"os"

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

	if err := db.AutoMigrate(&models.User{}, &models.Shift{}, &models.DrivingReport{}); err != nil {
		log.Fatal("Failed to auto-migrate schema:", err)
	}

	seedAdminUser(db)
	return db
}

// seedAdminUser ensures the default admin exists on every startup.
// Credentials are pulled from environment variables — nothing is hardcoded.
func seedAdminUser(db *gorm.DB) {
	phone    := os.Getenv("INITIAL_ADMIN_PHONE")
	password := os.Getenv("INITIAL_ADMIN_PASSWORD")
	username := os.Getenv("INITIAL_ADMIN_USERNAME") // Display name
	email    := os.Getenv("INITIAL_ADMIN_EMAIL")
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

	admin := models.User{
		FullName:        "מנהל מערכת", // Default placeholder
		Username:        username,
		Password:        string(hashed),
		Email:           email,
		Phone:           phone,
		Birthday:        birthday,
		Role:            models.RoleManager,
		DirectManager:   phone, // The admin manages themselves
		IsFlexibleModel: true,
		IsRegularModel:  true,
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Printf("Error seeding admin user: %v\n", err)
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

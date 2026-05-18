package models

import "gorm.io/gorm"

// Role defines the user's permission level.
type Role string

const (
	RoleEmployee Role = "employee"
	RoleManager  Role = "manager"
)

// User represents a system user. Phone is the unique login identifier.
type User struct {
	gorm.Model
	FullName        string `json:"fullName"`                          // First and last name
	Username        string `json:"username"`                          // Display name (not unique)
	Password        string `gorm:"not null"             json:"password"` // Allow binding for creation
	Email           string `json:"email"`
	Phone           string `gorm:"uniqueIndex;not null" json:"phone"` // Primary unique identifier
	Birthday        string `json:"birthday"`                          // Format: DD/MM/YYYY
	Role            Role   `gorm:"type:text;not null"   json:"role"`
	DirectManager   string `json:"directManager"`                     // Phone number of their manager
	IsFlexibleModel bool   `json:"isFlexibleModel"`
	IsRegularModel  bool   `json:"isRegularModel"`
}

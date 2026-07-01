package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"my-backend/add_user_validation"
	"my-backend/domain"
	"my-backend/models"
	"my-backend/utils"
)

// CreateUserHandler — manager creates a new employee
func CreateUserHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.User
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("ERROR: Failed to bind JSON for createUser: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}
		log.Printf("DEBUG: createUser payload received: %+v\n", req)

		// Run all business validations
		if !add_user_validation.AddUserValidation(c, &req, db) {
			return
		}

		// Hash the plain-text password before storing using utils.HashPassword
		hashed, err := utils.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בהצפנת הסיסמה"})
			return
		}
		req.Password = hashed

		// Fetch manager record to set DirectManager ID
		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}
		req.DirectManager = manager.ID

		if err := db.Users().Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת המשתמש"})
			return
		}

		// Create active manager assignment history record
		history := models.EmployeeManagerHistory{
			EmployeeIndex: req.ID,
			ManagerIndex:  manager.ID,
			StartDate:     utils.Now().Format("02/01/2006"),
			EndDate:       nil,
		}
		if err := db.EmployeeManagerHistories().Create(&history); err != nil {
			log.Printf("ERROR: Failed to create employee manager history record: %v\n", err)
		}

		c.JSON(http.StatusCreated, gin.H{"message": "משתמש נוצר בהצלחה"})
	}
}

// GetTeamHandler — manager gets only the employees they directly manage
func GetTeamHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}
		users, err := db.Users().GetByDirectManagerID(manager.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת רשימת העובדים"})
			return
		}
		for i := range users {
			users[i].Password = ""
		}
		c.JSON(http.StatusOK, users)
	}
}

// UpdateEmployeeHandler — Manager updates their employee's details
func UpdateEmployeeHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id64, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה משתמש לא תקין"})
			return
		}
		userID := uint(id64)

		var req models.User
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		targetUser, err := db.Users().GetByID(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "עובד לא נמצא"})
			return
		}

		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}

		if targetUser.DirectManager != manager.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין לך הרשאה לערוך משתמש זה"})
			return
		}

		if !add_user_validation.UpdateUserValidation(c, &req, userID, db) {
			return
		}

		targetUser.FullName = req.FullName
		targetUser.Username = req.Username
		targetUser.Email = req.Email
		targetUser.Phone = req.Phone
		targetUser.IsFlexibleModel = req.IsFlexibleModel
		targetUser.IsRegularModel = req.IsRegularModel

		if strings.TrimSpace(req.Password) != "" {
			hashed, err := utils.HashPassword(req.Password)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בהצפנת הסיסמה"})
				return
			}
			targetUser.Password = hashed
		}

		if err := db.Users().Update(targetUser); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בעדכון פרטי העובד"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "פרטי העובד עודכנו בהצלחה"})
	}
}

// DeleteEmployeeHandler — Manager deletes an employee
func DeleteEmployeeHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id64, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה משתמש לא תקין"})
			return
		}
		userID := uint(id64)

		targetUser, err := db.Users().GetByID(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "עובד לא נמצא"})
			return
		}

		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}

		if targetUser.DirectManager != manager.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין לך הרשאה למחוק משתמש זה"})
			return
		}

		// Close any active manager assignments in history by setting end_date to now
		if err := db.EmployeeManagerHistories().CloseActiveRecord(userID, utils.Now().Format("02/01/2006")); err != nil {
			log.Printf("ERROR: Failed to close active manager history on deletion: %v\n", err)
		}

		if err := db.Users().Delete(userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה במחיקת העובד"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "העובד נמחק בהצלחה"})
	}
}

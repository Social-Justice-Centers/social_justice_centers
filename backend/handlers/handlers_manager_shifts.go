package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"my-backend/domain"
	"my-backend/models"
	"my-backend/utils"
)

// GetTeamShiftsHandler — Manager gets shifts for employees they manage, filtered by history.
func GetTeamShiftsHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}

		// Fetch history records for this manager
		historyRecords, err := db.EmployeeManagerHistories().GetHistoryByManager(manager.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת היסטוריית הניהול"})
			return
		}

		type shiftWithUser struct {
			models.Shift
			EmployeeName string `json:"employeeName"`
		}
		var result []shiftWithUser

		for _, record := range historyRecords {
			employee, err := db.Users().GetByID(record.EmployeeIndex)
			if err != nil {
				continue
			}

			var endDate string
			if record.EndDate != nil {
				endDate = *record.EndDate
			}

			shifts, err := db.Shifts().GetByAssignedToInDateRange(employee.Phone, record.StartDate, endDate)
			if err != nil {
				continue
			}

			for _, s := range shifts {
				result = append(result, shiftWithUser{
					Shift:        s,
					EmployeeName: employee.FullName,
				})
			}
		}

		c.JSON(http.StatusOK, result)
	}
}

// AssignShiftHandler — Manager assigns a future shift to an employee
func AssignShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}

		var req models.Shift
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		// Verify the employee belongs to this manager
		employee, err := db.Users().GetByPhone(req.AssignedTo)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "עובד לא נמצא"})
			return
		}

		// Check if manager manages this employee
		historyRecords, err := db.EmployeeManagerHistories().GetHistoryByManager(manager.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בבדיקת ההרשאות"})
			return
		}

		isManaged := false
		for _, record := range historyRecords {
			if record.EmployeeIndex == employee.ID {
				isManaged = true
				break
			}
		}

		if !isManaged {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה לשבץ עובד זה"})
			return
		}

		// Validate date and times
		if err := validateShiftTimes(req.Date, req.StartTime, req.EndTime, req.WorkDuration); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Verify shift start time is in the future
		now := utils.Now()
		shiftStart, _ := time.ParseInLocation("02/01/2006 15:04", req.Date+" "+req.StartTime, now.Location())
		if shiftStart.Before(now) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "זמן המשמרת כבר עבר, לא ניתן לשבץ משמרת בעבר"})
			return
		}

		req.AssignedBy = managerPhone
		req.Type = "planned"

		if err := db.Shifts().Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת המשמרת"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "משמרת שובצה בהצלחה", "shift": req})
	}
}

// ApproveManagerShiftHandler — Manager approves a pending shift
func ApproveManagerShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id64, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה משמרת לא תקין"})
			return
		}

		shift, err := db.Shifts().GetByID(uint(id64))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "משמרת לא נמצאה"})
			return
		}

		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה"})
			return
		}

		// (Optional) Check history records if manager manages this employee
		historyRecords, _ := db.EmployeeManagerHistories().GetHistoryByManager(manager.ID)
		isManaged := false
		employee, _ := db.Users().GetByPhone(shift.AssignedTo)
		for _, record := range historyRecords {
			if record.EmployeeIndex == employee.ID {
				isManaged = true
				break
			}
		}

		if !isManaged {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה לאשר משמרת זו"})
			return
		}

		shift.Status = "approved"
		if err := db.Shifts().Update(shift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה באישור המשמרת"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "משמרת אושרה בהצלחה"})
	}
}

// RejectManagerShiftHandler — Manager rejects a pending/reported shift
func RejectManagerShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id64, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה משמרת לא תקין"})
			return
		}

		shift, err := db.Shifts().GetByID(uint(id64))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "משמרת לא נמצאה"})
			return
		}

		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה"})
			return
		}

		// Check if manager manages this employee
		historyRecords, _ := db.EmployeeManagerHistories().GetHistoryByManager(manager.ID)
		isManaged := false
		employee, err := db.Users().GetByPhone(shift.AssignedTo)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "עובד לא נמצא"})
			return
		}
		for _, record := range historyRecords {
			if record.EmployeeIndex == employee.ID {
				isManaged = true
				break
			}
		}

		if !isManaged {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה לדחות משמרת זו"})
			return
		}

		shift.Status = "rejected"
		if err := db.Shifts().Update(shift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בדחיית המשמרת"})
			return
		}

		// Send rejection email to employee if email is set
		if employee.Email != "" {
			shiftTime := fmt.Sprintf("%s-%s", shift.StartTime, shift.EndTime)
			if shift.EndTime == "" {
				shiftTime = shift.StartTime
			}
			if err := SendRejectionEmail(employee.Email, shift.Date, shiftTime); err != nil {
				log.Printf("ERROR: Failed to send rejection email to %s: %v\n", employee.Email, err)
			}
		}

		c.JSON(http.StatusOK, gin.H{"message": "משמרת נדחתה בהצלחה"})
	}
}

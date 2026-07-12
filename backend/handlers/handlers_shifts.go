package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"my-backend/domain"
	"my-backend/models"
	"my-backend/utils"
)

// GetMyShiftsHandler — user gets their own assigned shifts
func GetMyShiftsHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		shifts, err := db.Shifts().GetByAssignedTo(phone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת המשמרות"})
			return
		}
		var dtos []ShiftDTO
		for _, s := range shifts {
			domainShift := ModelShiftToDomain(db, s)
			dtos = append(dtos, ReportableShiftToDTO(domainShift))
		}
		c.JSON(http.StatusOK, dtos)
	}
}

// GetCurrentShiftHandler — Returns the active, open shift for the user
func GetCurrentShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		activeShift, err := db.Shifts().GetActiveShift(phone)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "אין משמרת פעילה"})
			return
		}
		domainShift := ModelShiftToDomain(db, *activeShift)
		c.JSON(http.StatusOK, ReportableShiftToDTO(domainShift))
	}
}

// ClockInHandler — Opens a new shift for the current user
func ClockInHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")

		// Check if already clocked in
		_, err := db.Shifts().GetActiveShift(phone)
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "כבר יש משמרת פעילה"})
			return
		}

		now := utils.Now()
		shift := models.Shift{
			AssignedTo: phone,
			AssignedBy: phone,
			Date:       now.Format("02/01/2006"),
			StartTime:  now.Format("15:04"),
			EndTime:    "",
			Type:       "reported",
			Status:     checkShiftApproval(db, phone, now.Format("02/01/2006"), now.Format("15:04"), "", "", false),
		}

		if err := ValidateDomainShift(db, shift); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.Shifts().Create(&shift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בכנסה למשמרת"})
			return
		}

		SyncDomainShift(db, shift)
		c.JSON(http.StatusCreated, ReportableShiftToDTO(ModelShiftToDomain(db, shift)))
	}
}

// ClockOutHandler — Closes the active shift
func ClockOutHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")

		var req struct {
			EndTime string `json:"endTime"`
			Notes   string `json:"notes"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		if req.EndTime == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "נא למלא שעת סיום"})
			return
		}

		activeShift, err := db.Shifts().GetActiveShift(phone)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "לא נמצאה משמרת פעילה לסיום"})
			return
		}

		activeShift.EndTime = req.EndTime
		activeShift.Notes = req.Notes

		if err := ValidateDomainShift(db, *activeShift); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		activeShift.Status = checkShiftApproval(db, phone, activeShift.Date, activeShift.StartTime, req.EndTime, req.Notes, false)

		if err := db.Shifts().Update(activeShift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביציאה מהמשמרת"})
			return
		}

		SyncDomainShift(db, *activeShift)
		consumePlannedShift(db, phone, activeShift.Date)

		c.JSON(http.StatusOK, gin.H{
			"message": "יציאה ממשמרת עודכנה בהצלחה",
			"shift":   ReportableShiftToDTO(ModelShiftToDomain(db, *activeShift)),
		})
	}
}

// ReportShiftHandler — employee self-reports worked hours
func ReportShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.Shift
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		phone := c.GetString("phone")
		req.AssignedTo = phone
		req.AssignedBy = phone
		req.Type = "reported"

		if err := ValidateDomainShift(db, req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		req.Status = checkShiftApproval(db, phone, req.Date, req.StartTime, req.EndTime, req.Notes, true)

		if err := db.Shifts().Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשמירת דיווח המשמרת"})
			return
		}

		SyncDomainShift(db, req)
		consumePlannedShift(db, phone, req.Date)

		c.JSON(http.StatusCreated, gin.H{
			"message": "דיווח המשמרת נשמר בהצלחה",
			"shift":   ReportableShiftToDTO(ModelShiftToDomain(db, req)),
		})
	}
}

// UpdateShiftHandler — Edit a shift (owner or manager)
func UpdateShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה משמרת לא תקין"})
			return
		}

		var req struct {
			Date      string `json:"date"`
			StartTime string `json:"startTime"`
			EndTime   string `json:"endTime"`
			Notes     string `json:"notes"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		shift, err := db.Shifts().GetByID(uint(id))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "משמרת לא נמצאה"})
			return
		}

		phone := c.GetString("phone")
		user, err := db.Users().GetByPhone(phone)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה"})
			return
		}

		isOwner := shift.AssignedTo == phone
		isManager := user.Role == models.RoleManager
		if !isOwner && !isManager {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה לערוך משמרת זו"})
			return
		}

		if !isManager && shift.Type == "planned" {
			c.JSON(http.StatusForbidden, gin.H{"error": "עובדים אינם רשאים לערוך משמרות מתוכננות"})
			return
		}

		if err := validateShiftTimes(req.Date, req.StartTime, req.EndTime, ""); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		shift.Date = req.Date
		shift.StartTime = req.StartTime
		shift.EndTime = req.EndTime
		shift.Notes = req.Notes

		if err := ValidateDomainShift(db, *shift); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if !isManager {
			shift.Status = "pending"
		}

		if err := db.Shifts().Update(shift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בעדכון המשמרת"})
			return
		}

		SyncDomainShift(db, *shift)

		c.JSON(http.StatusOK, gin.H{
			"message": "משמרת עודכנה בהצלחה",
			"shift":   ReportableShiftToDTO(ModelShiftToDomain(db, *shift)),
		})
	}
}

// DeleteShiftHandler — delete a shift (owner or manager)
func DeleteShiftHandler(db domain.Registry) gin.HandlerFunc {
	// Only owner or manager is authorized
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה משמרת לא תקין"})
			return
		}

		shift, err := db.Shifts().GetByID(uint(id))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "משמרת לא נמצאה"})
			return
		}

		phone := c.GetString("phone")
		user, err := db.Users().GetByPhone(phone)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה"})
			return
		}

		isManager := user.Role == models.RoleManager
		isCreator := shift.AssignedBy == phone
		if !isManager || !isCreator {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה למחוק משמרת זו (רק מנהל ששיבץ את המשמרת רשאי למחוק אותה)"})
			return
		}

		if err := db.Shifts().Delete(uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה במחיקת המשמרת"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "משמרת נמחקה בהצלחה"})
	}
}

func checkShiftApproval(db domain.Registry, phone string, date string, reportedStart string, reportedEnd string, reportedNotes string, checkNotes bool) string {
	shifts, err := db.Shifts().GetByAssignedToInDateRange(phone, date, date)
	if err != nil {
		return "pending"
	}

	for _, s := range shifts {
		if s.Type == "planned" {
			pStart, err1 := time.Parse("15:04", s.StartTime)
			rStart, err2 := time.Parse("15:04", reportedStart)
			if err1 != nil || err2 != nil {
				continue
			}
			
			startDiff := rStart.Sub(pStart).Minutes()
			if startDiff < -30 || startDiff > 30 {
				continue
			}

			if reportedEnd != "" && s.EndTime != "" {
				pEnd, err1 := time.Parse("15:04", s.EndTime)
				rEnd, err2 := time.Parse("15:04", reportedEnd)
				if err1 == nil && err2 == nil {
					endDiff := rEnd.Sub(pEnd).Minutes()
					if endDiff < -30 || endDiff > 30 {
						continue
					}
				}
			}

			if checkNotes {
				if s.Notes != reportedNotes {
					return "pending"
				}
			}
			return "approved"
		}
	}
	return "pending"
}

func consumePlannedShift(db domain.Registry, phone string, date string) {
	shifts, err := db.Shifts().GetByAssignedToInDateRange(phone, date, date)
	if err != nil {
		return
	}
	for _, s := range shifts {
		if s.Type == "planned" {
			_ = db.Shifts().Delete(s.ID)
		}
	}
}

func parseTimeToMinutes(tStr string) (int, error) {
	parts := strings.Split(tStr, ":")
	if len(parts) != 2 {
		return 0, fmt.Errorf("invalid time format")
	}
	var hrs, mins int
	_, err1 := fmt.Sscanf(parts[0], "%d", &hrs)
	_, err2 := fmt.Sscanf(parts[1], "%d", &mins)
	if err1 != nil || err2 != nil {
		return 0, fmt.Errorf("invalid integers")
	}
	return hrs*60 + mins, nil
}

func validateShiftTimes(date string, startTime string, endTime string, workDuration string) error {
	// 1. Validate Date (DD/MM/YYYY)
	tDate, err := time.Parse("02/01/2006", date)
	if err != nil {
		return fmt.Errorf("תאריך לא תקין, נדרש פורמט DD/MM/YYYY (לדוגמה 15/06/2026)")
	}
	if tDate.Year() < 2000 || tDate.Year() > 2100 {
		return fmt.Errorf("שנת התאריך חייבת להיות בין 2000 ל-2100")
	}

	// Skip time validations for flexible shifts
	if workDuration != "" {
		return nil
	}

	// 2. Validate StartTime (HH:MM)
	tStart, err := time.Parse("15:04", startTime)
	if err != nil {
		return fmt.Errorf("שעת התחלה לא תקינה, נדרש פורמט HH:MM (לדוגמה 08:30)")
	}

	// 3. Validate EndTime (HH:MM) if not empty
	if endTime != "" {
		tEnd, err := time.Parse("15:04", endTime)
		if err != nil {
			return fmt.Errorf("שעת סיום לא תקינה, נדרש פורמט HH:MM (לדוגמה 17:00)")
		}

		if !tEnd.After(tStart) {
			return fmt.Errorf("שעת סיום חייבת להיות אחרי שעת התחלה")
		}
	}

	return nil
}

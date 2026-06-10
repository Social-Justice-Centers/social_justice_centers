package Initialization

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"

	"my-backend/add_user_validation"
	"my-backend/domain"
	"my-backend/models"
	"my-backend/utils"
)

type otpRequestPayload struct {
	Phone string `json:"phone"`
}

type otpVerifyPayload struct {
	Phone string `json:"phone"`
	OTP   string `json:"otp"`
}

// SetupRouter wires up all API routes and middleware.
func SetupRouter(db domain.Registry) *gin.Engine {
	r := gin.Default()

	// Session store
	store := cookie.NewStore([]byte("secret_key_for_session_12345"))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})
	r.Use(sessions.Sessions("mysession", store))

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return true // Dynamically allow any origin, useful for VM IPs
		},
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// --- Public Routes ---
	r.POST("/otp/request", requestOTPHandler(db))
	r.POST("/otp/verify", verifyOTPHandler(db))
	r.POST("/logout", logoutHandler())

	// --- Authenticated Routes (any logged-in user) ---
	auth := r.Group("/")
	auth.Use(requireAuth())
	{
		auth.GET("/me", meHandler(db))
		auth.GET("/shifts", getMyShiftsHandler(db))
		auth.GET("/shifts/current", getCurrentShiftHandler(db))
		auth.POST("/shifts/clock-in", clockInHandler(db))
		auth.PUT("/shifts/clock-out", clockOutHandler(db))
		auth.POST("/shifts/report", reportShiftHandler(db))
		auth.PUT("/shifts/:id", updateShiftHandler(db))
		auth.DELETE("/shifts/:id", deleteShiftHandler(db))
		auth.POST("/driving-reports", submitDrivingReportHandler(db))
		auth.GET("/driving-reports", getMyDrivingReportsHandler(db))
		auth.GET("/driving-reports/:id/file", downloadDrivingReportFileHandler(db))
		auth.PUT("/driving-reports/:id", updateDrivingReportHandler(db))
	}

	// --- Manager-Only Routes ---
	mgr := r.Group("/")
	mgr.Use(requireAuth(), requireManager(db))
	{
		mgr.POST("/users", createUserHandler(db))
		mgr.GET("/users/team", getTeamHandler(db))
		mgr.PUT("/users/:id", updateEmployeeHandler(db))
		mgr.DELETE("/users/:id", deleteEmployeeHandler(db))
		mgr.GET("/manager/driving-reports", getTeamDrivingReportsHandler(db))
		mgr.PUT("/manager/driving-reports/:id/approve", approveDrivingReportHandler(db))
		mgr.GET("/manager/team/shifts", getTeamShiftsHandler(db))
		mgr.POST("/manager/team/shifts", assignShiftHandler(db))
		mgr.PUT("/manager/shifts/:id/approve", approveManagerShiftHandler(db))
		mgr.GET("/manager/export/michpal", exportMichpalHandler(db))
	}

	return r
}

// =============================================================================
// Middleware
// =============================================================================

// requireAuth ensures the request has a valid session, then exposes phone via context.
func requireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		phone := session.Get("phone")
		if phone == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "נדרשת התחברות"})
			return
		}
		c.Set("phone", phone.(string))
		c.Next()
	}
}

// requireManager ensures the logged-in user has the Manager role.
func requireManager(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		user, err := db.Users().GetByPhone(phone)
		if err != nil || user.Role != models.RoleManager {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "הרשאת מנהל נדרשת"})
			return
		}
		c.Next()
	}
}

// =============================================================================
// Handlers
// =============================================================================

// POST /otp/request — looks up user by phone, generates OTP, sends to their email.
func requestOTPHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req otpRequestPayload
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		user, err := db.Users().GetByPhone(req.Phone)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "מספר טלפון לא קיים במערכת"})
			return
		}

		if user.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "לא הוגדרה כתובת אימייל עבור משתמש זה"})
			return
		}

		otp, err := generateOTP()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת הקוד"})
			return
		}

		storeOTP(req.Phone, otp)

		if err := sendOTPEmail(user.Email, otp); err != nil {
			log.Printf("ERROR: Failed to send OTP email to %s: %v\n", user.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליחת הקוד לאימייל"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "קוד נשלח לכתובת האימייל"})
	}
}

// POST /otp/verify — verifies the OTP and opens a session.
func verifyOTPHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req otpVerifyPayload
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		if !verifyAndConsumeOTP(req.Phone, req.OTP) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "קוד שגוי או שפג תוקפו"})
			return
		}

		user, err := db.Users().GetByPhone(req.Phone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המשתמש"})
			return
		}

		session := sessions.Default(c)
		session.Set("phone", user.Phone)
		if err := session.Save(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשמירת הסשן"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "התחברות בוצעה בהצלחה",
			"role":    user.Role,
		})
	}
}

// POST /logout
func logoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		session.Clear()
		_ = session.Save()
		c.JSON(http.StatusOK, gin.H{"message": "התנתקות בוצעה בהצלחה"})
	}
}

// GET /me — returns the current user's profile
func meHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		user, err := db.Users().GetByPhone(phone)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "משתמש לא נמצא"})
			return
		}
		c.JSON(http.StatusOK, user)
	}
}

// POST /users — manager creates a new employee
func createUserHandler(db domain.Registry) gin.HandlerFunc {
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

		// Hash the plain-text password before storing
		hashed, err := HashPassword(req.Password)
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

// GET /users/team — manager gets only the employees they directly manage
func getTeamHandler(db domain.Registry) gin.HandlerFunc {
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

// GET /shifts — user gets their own assigned shifts
func getMyShiftsHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		shifts, err := db.Shifts().GetByAssignedTo(phone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת המשמרות"})
			return
		}
		c.JSON(http.StatusOK, shifts)
	}
}

// PUT /shifts/:id — Edit a shift (owner or manager)
func updateShiftHandler(db domain.Registry) gin.HandlerFunc {
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

		shift.Date = req.Date
		shift.StartTime = req.StartTime
		shift.EndTime = req.EndTime
		shift.Notes = req.Notes

		if err := db.Shifts().Update(shift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בעדכון המשמרת"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "משמרת עודכנה בהצלחה"})
	}
}

// DELETE /shifts/:id — delete a shift (owner or manager)
func deleteShiftHandler(db domain.Registry) gin.HandlerFunc {
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

		isOwner := shift.AssignedTo == phone
		isManager := user.Role == models.RoleManager
		if !isOwner && !isManager {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה למחוק משמרת זו"})
			return
		}

		if err := db.Shifts().Delete(uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה במחיקת המשמרת"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "משמרת נמחקה בהצלחה"})
	}
}

func checkShiftApproval(db domain.Registry, phone string, date string, reportedNotes string, checkNotes bool) string {
	shifts, err := db.Shifts().GetByAssignedToInDateRange(phone, date, date)
	if err != nil {
		return "pending"
	}

	now := utils.Now()

	for _, s := range shifts {
		if s.Type == "planned" {
			t, err := time.Parse("15:04", s.StartTime)
			if err != nil {
				continue
			}
			plannedTime := time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, now.Location())

			diff := now.Sub(plannedTime).Hours()
			if diff >= -1.0 && diff <= 1.0 {
				if checkNotes {
					if s.Notes != reportedNotes {
						return "pending"
					}
				}
				return "approved"
			}
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

// POST /shifts/report — employee self-reports their own worked hours
func reportShiftHandler(db domain.Registry) gin.HandlerFunc {
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
		req.Status = checkShiftApproval(db, phone, req.Date, req.Notes, true)

		if err := db.Shifts().Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשמירת דיווח המשמרת"})
			return
		}

		consumePlannedShift(db, phone, req.Date)

		c.JSON(http.StatusCreated, gin.H{"message": "דיווח המשמרת נשמר בהצלחה"})
	}
}

// GET /shifts/current — Returns the active, open shift (missing EndTime) for the logged-in user
func getCurrentShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		activeShift, err := db.Shifts().GetActiveShift(phone)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "אין משמרת פעילה"})
			return
		}
		c.JSON(http.StatusOK, activeShift)
	}
}

// POST /shifts/clock-in — Opens a new shift for the current user
func clockInHandler(db domain.Registry) gin.HandlerFunc {
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
			Status:     checkShiftApproval(db, phone, now.Format("02/01/2006"), "", false),
		}

		if err := db.Shifts().Create(&shift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בכנסה למשמרת"})
			return
		}
		c.JSON(http.StatusCreated, shift)
	}
}

// PUT /shifts/clock-out — Closes the active shift for the current user
func clockOutHandler(db domain.Registry) gin.HandlerFunc {
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

		if err := db.Shifts().Update(activeShift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביציאה מהמשמרת"})
			return
		}

		consumePlannedShift(db, phone, activeShift.Date)

		c.JSON(http.StatusOK, gin.H{"message": "יציאה ממשמרת עודכנה בהצלחה"})
	}
}

// POST /driving-reports — Employee submits a driving report with an optional file
func submitDrivingReportHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")

		if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קובץ גדול מדי או קלט לא תקין"})
			return
		}

		description := c.PostForm("description")
		totalCostStr := c.PostForm("totalCost")
		totalCost, _ := strconv.ParseFloat(totalCostStr, 64)

		report := models.DrivingReport{
			UserPhone:   phone,
			Date:        utils.Now().Format("02/01/2006"),
			Description: description,
			TotalCost:   totalCost,
		}

		file, header, err := c.Request.FormFile("file")
		if err == nil {
			defer file.Close()
			if ext := strings.ToLower(filepath.Ext(header.Filename)); ext != ".pdf" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ניתן לצרף קבצי PDF בלבד"})
				return
			}
			uploadsDir := os.Getenv("UPLOADS_DIR")
			if uploadsDir == "" {
				uploadsDir = "./uploads"
			}
			if err := os.MkdirAll(uploadsDir, 0755); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת תיקיית העלאות"})
				return
			}
			safeName := fmt.Sprintf("%d_%s", utils.Now().UnixNano(), filepath.Base(header.Filename))
			destPath := filepath.Join(uploadsDir, safeName)
			dest, err := os.Create(destPath)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשמירת הקובץ"})
				return
			}
			defer dest.Close()
			if _, err := io.Copy(dest, file); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בכתיבת הקובץ"})
				return
			}
			report.FilePath = destPath
			report.FileName = header.Filename
		}

		if err := db.DrivingReports().Create(&report); err != nil {
			log.Printf("submitDrivingReport: DB error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשמירת הדוח"})
			return
		}
		c.JSON(http.StatusCreated, report)
	}
}

// GET /driving-reports — Employee gets their own driving reports
func getMyDrivingReportsHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		reports, err := db.DrivingReports().GetByUserPhone(phone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בטעינת דוחות"})
			return
		}
		c.JSON(http.StatusOK, reports)
	}
}

// GET /driving-reports/:id/file — Employee downloads their own report file
func downloadDrivingReportFileHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		idStr := c.Param("id")
		id64, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה לא תקין"})
			return
		}

		report, err := db.DrivingReports().GetByID(uint(id64))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "דוח לא נמצא"})
			return
		}

		user, _ := db.Users().GetByPhone(phone)
		if report.UserPhone != phone && (user == nil || user.Role == models.RoleEmployee) {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה לצפות בקובץ זה"})
			return
		}

		if report.FilePath == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "אין קובץ מצורף לדוח זה"})
			return
		}

		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, report.FileName))
		c.File(report.FilePath)
	}
}

// PUT /driving-reports/:id — Edit a driving report (owner or manager)
func updateDrivingReportHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה דוח לא תקין"})
			return
		}

		var req struct {
			Description string  `json:"description"`
			TotalCost   float64 `json:"totalCost"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		report, err := db.DrivingReports().GetByID(uint(id))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "דוח לא נמצא"})
			return
		}

		phone := c.GetString("phone")
		user, err := db.Users().GetByPhone(phone)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה"})
			return
		}

		isOwner := report.UserPhone == phone
		isManager := user.Role == models.RoleManager
		if !isOwner && !isManager {
			c.JSON(http.StatusForbidden, gin.H{"error": "אין הרשאה לערוך דוח זה"})
			return
		}

		report.Description = req.Description
		report.TotalCost = req.TotalCost

		if err := db.DrivingReports().Update(report); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בעדכון הדוח"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "הדוח עודכן בהצלחה"})
	}
}

// GET /manager/driving-reports/team — Manager gets all team driving reports
func getTeamDrivingReportsHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}
		teamMembers, err := db.Users().GetByDirectManagerID(manager.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בטעינת הצוות"})
			return
		}

		phones := make([]string, 0, len(teamMembers))
		nameByPhone := make(map[string]string, len(teamMembers))
		for _, m := range teamMembers {
			phones = append(phones, m.Phone)
			nameByPhone[m.Phone] = m.FullName
		}

		reports, err := db.DrivingReports().GetByUserPhones(phones)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בטעינת דוחות"})
			return
		}

		type reportWithName struct {
			models.DrivingReport
			FullName string `json:"fullName"`
		}
		result := make([]reportWithName, 0, len(reports))
		for _, r := range reports {
			result = append(result, reportWithName{DrivingReport: r, FullName: nameByPhone[r.UserPhone]})
		}
		c.JSON(http.StatusOK, result)
	}
}

// PUT /manager/driving-reports/:id/approve — Manager approves a driving report
func approveDrivingReportHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		managerPhone := c.GetString("phone")
		idStr := c.Param("id")
		id64, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה לא תקין"})
			return
		}

		if err := db.DrivingReports().Approve(uint(id64), managerPhone); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה באישור הדוח"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "הדוח אושר בהצלחה"})
	}
}

// GET /manager/team/shifts — Manager gets shifts for employees they manage, filtered by history.
func getTeamShiftsHandler(db domain.Registry) gin.HandlerFunc {
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

// POST /manager/team/shifts — Manager assigns a future shift to an employee
func assignShiftHandler(db domain.Registry) gin.HandlerFunc {
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

		req.AssignedBy = managerPhone
		req.Type = "planned"

		if err := db.Shifts().Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת המשמרת"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "משמרת שובצה בהצלחה", "shift": req})
	}
}

// PUT /manager/shifts/:id/approve — Manager approves a pending shift
func approveManagerShiftHandler(db domain.Registry) gin.HandlerFunc {
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

// PUT /users/:id — Manager updates their employee's details
func updateEmployeeHandler(db domain.Registry) gin.HandlerFunc {
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
			hashed, err := HashPassword(req.Password)
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

// DELETE /users/:id — Manager deletes an employee
func deleteEmployeeHandler(db domain.Registry) gin.HandlerFunc {
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

// GET /manager/export/michpal — Manager exports attendance & payroll data for their team
func exportMichpalHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		month := c.Query("month")
		year := c.Query("year")

		now := utils.Now()
		if month == "" {
			month = fmt.Sprintf("%02d", now.Month())
		}
		if year == "" {
			year = fmt.Sprintf("%d", now.Year())
		}

		if len(month) != 2 || len(year) != 4 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "חודש או שנת מס לא תקינים"})
			return
		}

		managerPhone := c.GetString("phone")
		manager, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}

		teamMembers, err := db.Users().GetByDirectManagerID(manager.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת רשימת העובדים"})
			return
		}

		type employeeReport struct {
			Phone       string
			FullName    string
			TotalHours  float64
			TotalTravel float64
		}

		var reports []employeeReport

		for _, emp := range teamMembers {
			// 1. Calculate total shifts hours for target month/year
			shifts, err := db.Shifts().GetByAssignedTo(emp.Phone)
			totalHours := 0.0
			if err == nil {
				for _, s := range shifts {
					// Date format: DD/MM/YYYY
					if len(s.Date) == 10 && s.Date[3:5] == month && s.Date[6:10] == year && s.Type == "reported" {
						if s.EndTime != "" {
							// Parse StartTime & EndTime
							startMins, err1 := parseTimeToMinutes(s.StartTime)
							endMins, err2 := parseTimeToMinutes(s.EndTime)
							if err1 == nil && err2 == nil {
								diff := endMins - startMins
								if diff < 0 {
									diff += 24 * 60 // Overnight shift
								}
								totalHours += float64(diff) / 60.0
							}
						} else {
							// Flexible shifts (e.g. reported via day option which might have empty EndTime)
							switch s.WorkDuration {
							case "full", "one day":
								totalHours += 8.0
							case "half", "half day":
								totalHours += 4.0
							case "sick", "sick day":
								totalHours += 8.0
							}
						}
					}
				}
			}

			// 2. Calculate approved driving reports for target month/year
			drvReports, err := db.DrivingReports().GetByUserPhone(emp.Phone)
			totalTravel := 0.0
			if err == nil {
				for _, dr := range drvReports {
					if dr.Approved && len(dr.Date) == 10 && dr.Date[3:5] == month && dr.Date[6:10] == year {
						totalTravel += dr.TotalCost
					}
				}
			}

			reports = append(reports, employeeReport{
				Phone:       emp.Phone,
				FullName:    emp.FullName,
				TotalHours:  totalHours,
				TotalTravel: totalTravel,
			})
		}

		// Generate SpreadsheetML XML
		rowsXml := ""
		for _, r := range reports {
			rowsXml += fmt.Sprintf(`   <Row ss:Height="20">
    <Cell><Data ss:Type="String">%s</Data></Cell>
    <Cell><Data ss:Type="String">%s</Data></Cell>
    <Cell><Data ss:Type="Number">%.2f</Data></Cell>
    <Cell><Data ss:Type="Number">%.2f</Data></Cell>
   </Row>
`, r.Phone, r.FullName, r.TotalHours, r.TotalTravel)
		}

		createdTime := now.Format("2006-01-02T15:04:05Z")

		xmlContent := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Social Justice Centers</Author>
  <Created>%s</Created>
 </DocumentProperties>
 <Worksheet ss:Name="Michpal Import">
  <Table ss:ExpandedColumnCount="4">
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">חברה</Data></Cell>
    <Cell><Data ss:Type="String">שנת מס</Data></Cell>
    <Cell><Data ss:Type="String">חודש דיווח</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">מרכזים לצדק חברתי</Data></Cell>
    <Cell><Data ss:Type="Number">%s</Data></Cell>
    <Cell><Data ss:Type="String">%s</Data></Cell>
   </Row>
   <Row ss:Height="10"/>
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">תעודת זהות</Data></Cell>
    <Cell><Data ss:Type="String">שם עובד</Data></Cell>
    <Cell><Data ss:Type="String">שעות עבודה</Data></Cell>
    <Cell><Data ss:Type="String">נסיעות</Data></Cell>
   </Row>
%s  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`, createdTime, year, month, rowsXml)

		c.Header("Content-Type", "application/vnd.ms-excel; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=michpal_export_%s_%s.xls", year, month))
		c.String(http.StatusOK, xmlContent)
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

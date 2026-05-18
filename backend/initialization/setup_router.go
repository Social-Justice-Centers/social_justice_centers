package Initialization

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"

	"my-backend/add_user_validation"
	"my-backend/domain"
	"my-backend/models"
)

// loginRequest is the payload for the login endpoint.
type loginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

// SetupRouter wires up all API routes and middleware.
func SetupRouter(db domain.Registry) *gin.Engine {
	r := gin.Default()

	// Session store
	store := cookie.NewStore([]byte("secret_key_for_session_12345"))
	r.Use(sessions.Sessions("mysession", store))

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "https://frontend-service-413114889880.us-central1.run.app"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// --- Public Routes ---
	r.POST("/login", loginHandler(db))
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
		auth.POST("/shifts/report", reportShiftHandler(db)) // Employee self-reports their hours
	}

	// --- Manager-Only Routes ---
	mgr := r.Group("/")
	mgr.Use(requireAuth(), requireManager(db))
	{
		mgr.POST("/users", createUserHandler(db))
		mgr.GET("/users/team", getTeamHandler(db))
		mgr.POST("/shifts", assignShiftHandler(db))
		mgr.DELETE("/shifts/:id", deleteShiftHandler(db))
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

// POST /login
func loginHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req loginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		user, err := db.Users().GetByPhone(req.Phone)
		if err != nil || !CheckPasswordHash(req.Password, user.Password) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "מספר טלפון או סיסמה שגויים"})
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

// GET /me — returns the current user's profile (password excluded via json:"-")
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

		// DirectManager is always the logged-in manager's phone — not trusted from client
		req.DirectManager = c.GetString("phone")

		if err := db.Users().Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת המשתמש"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "משתמש נוצר בהצלחה"})
	}
}

// GET /users/team — manager gets only the employees they directly manage
func getTeamHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		managerPhone := c.GetString("phone")
		users, err := db.Users().GetByDirectManager(managerPhone)
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

// POST /shifts — manager assigns a shift to a team member (or themselves)
func assignShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.Shift
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		managerPhone := c.GetString("phone")

		// Security: only allow assigning to own team members or to themselves
		if req.AssignedTo != managerPhone {
			team, err := db.Users().GetByDirectManager(managerPhone)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בגישה לרשימת העובדים"})
				return
			}
			isTeamMember := false
			for _, member := range team {
				if member.Phone == req.AssignedTo {
					isTeamMember = true
					break
				}
			}
			if !isTeamMember {
				c.JSON(http.StatusForbidden, gin.H{"error": "ניתן להקצות משמרות רק לעובדים תחת ניהולך"})
				return
			}
		}

		// AssignedBy is always the server-side logged-in manager's phone
		req.AssignedBy = managerPhone
		req.Type = "planned"

		if err := db.Shifts().Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת המשמרת"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "משמרת הוקצתה בהצלחה"})
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

// DELETE /shifts/:id — manager deletes a shift they assigned
func deleteShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "מזהה משמרת לא תקין"})
			return
		}

		managerPhone := c.GetString("phone")

		// Verify the shift was assigned by this manager before deleting
		shifts, err := db.Shifts().GetByAssignedBy(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בגישה למשמרות"})
			return
		}

		found := false
		for _, s := range shifts {
			if s.ID == uint(id) {
				found = true
				break
			}
		}
		if !found {
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

// POST /shifts/report — employee self-reports their own worked hours
func reportShiftHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.Shift
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		phone := c.GetString("phone")

		// Both fields are set server-side — the employee reports for themselves
		req.AssignedTo = phone
		req.AssignedBy = phone
		req.Type = "reported"

		if err := db.Shifts().Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשמירת דיווח המשמרת"})
			return
		}

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

		now := time.Now()
		shift := models.Shift{
			AssignedTo: phone,
			AssignedBy: phone,
			Date:       now.Format("02/01/2006"),
			StartTime:  now.Format("15:04"),
			EndTime:    "",
			Type:       "reported",
		}

		if err := db.Shifts().Create(&shift); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בכניסה למשמרת"})
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

		c.JSON(http.StatusOK, gin.H{"message": "יציאה ממשמרת עודכנה בהצלחה"})
	}
}
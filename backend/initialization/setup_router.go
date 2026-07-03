package Initialization

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"

	"my-backend/domain"
	"my-backend/handlers"
)

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
	r.POST("/otp/request", handlers.RequestOTPHandler(db))
	r.POST("/otp/verify", handlers.VerifyOTPHandler(db))
	r.POST("/logout", handlers.LogoutHandler())

	// --- Authenticated Routes (any logged-in user) ---
	auth := r.Group("/")
	auth.Use(handlers.RequireAuth())
	{
		auth.GET("/me", handlers.MeHandler(db))
		auth.GET("/shifts", handlers.GetMyShiftsHandler(db))
		auth.GET("/shifts/current", handlers.GetCurrentShiftHandler(db))
		auth.POST("/shifts/clock-in", handlers.ClockInHandler(db))
		auth.PUT("/shifts/clock-out", handlers.ClockOutHandler(db))
		auth.POST("/shifts/report", handlers.ReportShiftHandler(db))
		auth.PUT("/shifts/:id", handlers.UpdateShiftHandler(db))
		auth.DELETE("/shifts/:id", handlers.DeleteShiftHandler(db))
		auth.POST("/driving-reports", handlers.SubmitDrivingReportHandler(db))
		auth.GET("/driving-reports", handlers.GetMyDrivingReportsHandler(db))
		auth.GET("/driving-reports/:id/file", handlers.DownloadDrivingReportFileHandler(db))
		auth.PUT("/driving-reports/:id", handlers.UpdateDrivingReportHandler(db))
	}

	// --- Manager-Only Routes ---
	mgr := r.Group("/")
	mgr.Use(handlers.RequireAuth(), handlers.RequireManager(db))
	{
		mgr.POST("/users", handlers.CreateUserHandler(db))
		mgr.GET("/users/team", handlers.GetTeamHandler(db))
		mgr.PUT("/users/:id", handlers.UpdateEmployeeHandler(db))
		mgr.DELETE("/users/:id", handlers.DeleteEmployeeHandler(db))
		mgr.GET("/manager/driving-reports", handlers.GetTeamDrivingReportsHandler(db))
		mgr.PUT("/manager/driving-reports/:id/approve", handlers.ApproveDrivingReportHandler(db))
		mgr.GET("/manager/team/shifts", handlers.GetTeamShiftsHandler(db))
		mgr.POST("/manager/team/shifts", handlers.AssignShiftHandler(db))
		mgr.PUT("/manager/shifts/:id/approve", handlers.ApproveManagerShiftHandler(db))
		mgr.PUT("/manager/shifts/:id/reject", handlers.RejectManagerShiftHandler(db))
		mgr.GET("/manager/export/michpal", handlers.ExportMichpalHandler(db))
	}

	return r
}

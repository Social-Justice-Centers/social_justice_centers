package handlers

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"

	"my-backend/domain"
)

type otpRequestPayload struct {
	Phone string `json:"phone"`
}

type otpVerifyPayload struct {
	Phone string `json:"phone"`
	OTP   string `json:"otp"`
}

// RequestOTPHandler — looks up user by phone, generates OTP, sends to their email.
func RequestOTPHandler(db domain.Registry) gin.HandlerFunc {
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

		otp, err := GenerateOTP()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת הקוד"})
			return
		}

		StoreOTP(req.Phone, otp)

		devPassword := os.Getenv("DEV_PASSWORD")
		if devPassword != "" {
			log.Println("Dev mode enabled: Skipping OTP email sending.")
		} else {
			if err := SendOTPEmail(user.Email, otp); err != nil {
				log.Printf("ERROR: Failed to send OTP email to %s: %v\n", user.Email, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליחת הקוד לאימייל"})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{"message": "קוד נשלח לכתובת האימייל (או שדולג בגלל מצב פיתוח)"})
	}
}

// VerifyOTPHandler — verifies the OTP and opens a session.
func VerifyOTPHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req otpVerifyPayload
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "קלט לא תקין"})
			return
		}

		devPassword := os.Getenv("DEV_PASSWORD")
		isDevBypass := devPassword != "" && req.OTP == devPassword

		if !isDevBypass && !VerifyAndConsumeOTP(req.Phone, req.OTP) {
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

// LogoutHandler
func LogoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		session.Clear()
		_ = session.Save()
		c.JSON(http.StatusOK, gin.H{"message": "התנתקות בוצעה בהצלחה"})
	}
}

// MeHandler — returns the current user's profile
func MeHandler(db domain.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.GetString("phone")
		user, err := db.Users().GetByPhone(phone)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "משתמש לא נמצא"})
			return
		}

		// Phase 1 Migration: Convert to Domain model, then to DTO
		employable := domain.UserToEmployable(user)
		userDTO := EmployableToDTO(employable)

		c.JSON(http.StatusOK, userDTO)
	}
}

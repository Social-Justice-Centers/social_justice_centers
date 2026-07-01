package handlers

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"

	"my-backend/domain"
	"my-backend/models"
)

// RequireAuth ensures the request has a valid session, then exposes phone via context.
func RequireAuth() gin.HandlerFunc {
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

// RequireManager ensures the logged-in user has the Manager role.
func RequireManager(db domain.Registry) gin.HandlerFunc {
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

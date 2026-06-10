package add_user_validation

import (
	"net/http"
	"regexp"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
	"my-backend/domain"
	"my-backend/models"
)

var emailRegex = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// AddUserValidation validates a new user request against business rules.
// Returns true if all checks pass; otherwise writes the error response and returns false.
func AddUserValidation(c *gin.Context, req *models.User, store domain.Registry) bool {

	// 0. FullName must not be empty
	if strings.TrimSpace(req.FullName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "שם מלא לא יכול להיות ריק"})
		return false
	}

	// 1. Display name (Username) must not be empty
	if strings.TrimSpace(req.Username) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "שם המשתמש לא יכול להיות ריק"})
		return false
	}

	// 2. Password must not be empty
	if strings.TrimSpace(req.Password) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "סיסמה לא יכולה להיות ריקה"})
		return false
	}

	// 3. Email must not be empty
	if strings.TrimSpace(req.Email) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "כתובת אימייל היא שדה חובה לצורך קבלת קוד כניסה"})
		return false
	}

	// 4. Email must be a valid address
	if !emailRegex.MatchString(req.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "כתובת האימייל אינה תקינה"})
		return false
	}

	// 5. Phone must contain digits only
	for _, ch := range req.Phone {
		if !unicode.IsDigit(ch) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "על מספר טלפון להכיל ספרות בלבד"})
			return false
		}
	}

	// 6. Phone must be exactly 10 digits
	if len(req.Phone) != 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "על מספר טלפון להכיל 10 ספרות בדיוק"})
		return false
	}

	// 7. Role must be a valid value
	if req.Role != models.RoleEmployee && req.Role != models.RoleManager {
		c.JSON(http.StatusBadRequest, gin.H{"error": "תפקיד לא חוקי — חייב להיות employee או manager"})
		return false
	}

	// 8. Phone must be unique in the system
	exists, err := store.Users().ExistsByPhone(req.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בגישה למסד הנתונים"})
		return false
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "משתמש עם מספר טלפון זה כבר קיים"})
		return false
	}
	
	// 9. At least one model must be selected
	if !req.IsFlexibleModel && !req.IsRegularModel {
		c.JSON(http.StatusBadRequest, gin.H{"error": "חובה לבחור לפחות מודל עבודה אחד (גמיש או רגיל)"})
		return false
	}

	return true
}

// UpdateUserValidation validates an edit user request against business rules.
func UpdateUserValidation(c *gin.Context, req *models.User, userID uint, store domain.Registry) bool {
	// 0. FullName must not be empty
	if strings.TrimSpace(req.FullName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "שם מלא לא יכול להיות ריק"})
		return false
	}

	// 1. Display name (Username) must not be empty
	if strings.TrimSpace(req.Username) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "שם המשתמש לא יכול להיות ריק"})
		return false
	}

	// 3. Email must not be empty
	if strings.TrimSpace(req.Email) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "כתובת אימייל היא שדה חובה לצורך קבלת קוד כניסה"})
		return false
	}

	// 4. Email must be a valid address
	if !emailRegex.MatchString(req.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "כתובת האימייל אינה תקינה"})
		return false
	}

	// 5. Phone must contain digits only
	for _, ch := range req.Phone {
		if !unicode.IsDigit(ch) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "על מספר טלפון להכיל ספרות בלבד"})
			return false
		}
	}

	// 6. Phone must be exactly 10 digits
	if len(req.Phone) != 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "על מספר טלפון להכיל 10 ספרות בדיוק"})
		return false
	}

	// 7. Role must be a valid value
	if req.Role != models.RoleEmployee && req.Role != models.RoleManager {
		c.JSON(http.StatusBadRequest, gin.H{"error": "תפקיד לא חוקי — חייב להיות employee או manager"})
		return false
	}

	// 8. Phone must be unique in the system (excluding the current user)
	existing, err := store.Users().GetByPhone(req.Phone)
	if err == nil && existing != nil && existing.ID != userID {
		c.JSON(http.StatusConflict, gin.H{"error": "משתמש עם מספר טלפון זה כבר קיים"})
		return false
	}

	// 8b. Email must be unique in the system (excluding the current user)
	if strings.TrimSpace(req.Email) != "" {
		existingEmail, err := store.Users().GetByEmail(req.Email)
		if err == nil && existingEmail != nil && existingEmail.ID != userID {
			c.JSON(http.StatusConflict, gin.H{"error": "משתמש עם כתובת אימייל זו כבר קיים"})
			return false
		}
	}

	// 9. At least one model must be selected
	if !req.IsFlexibleModel && !req.IsRegularModel {
		c.JSON(http.StatusBadRequest, gin.H{"error": "חובה לבחור לפחות מודל עבודה אחד (גמיש או רגיל)"})
		return false
	}

	return true
}
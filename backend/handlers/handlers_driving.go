package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"my-backend/domain"
	"my-backend/models"
	"my-backend/utils"
)

// SubmitDrivingReportHandler — Employee submits a driving report with an optional file
func SubmitDrivingReportHandler(db domain.Registry) gin.HandlerFunc {
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

// GetMyDrivingReportsHandler — Employee gets their own driving reports
func GetMyDrivingReportsHandler(db domain.Registry) gin.HandlerFunc {
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

// DownloadDrivingReportFileHandler — Employee downloads their own report file
func DownloadDrivingReportFileHandler(db domain.Registry) gin.HandlerFunc {
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

// UpdateDrivingReportHandler — Edit a driving report (owner or manager)
func UpdateDrivingReportHandler(db domain.Registry) gin.HandlerFunc {
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

// GetTeamDrivingReportsHandler — Manager gets all team driving reports
func GetTeamDrivingReportsHandler(db domain.Registry) gin.HandlerFunc {
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

// ApproveDrivingReportHandler — Manager approves a driving report
func ApproveDrivingReportHandler(db domain.Registry) gin.HandlerFunc {
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

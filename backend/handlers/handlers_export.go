package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"my-backend/domain"
	"my-backend/utils"
)

// ExportMichpalHandler — Manager exports attendance & payroll data for their team
func ExportMichpalHandler(db domain.Registry) gin.HandlerFunc {
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
		managerUser, err := db.Users().GetByPhone(managerPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת פרטי המנהל"})
			return
		}
		
		managerEmp := domain.UserToEmployable(managerUser)

		teamMembers, err := db.Users().GetByDirectManagerID(managerUser.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה בשליפת רשימת העובדים"})
			return
		}

		var reports []domain.EmployeeReportRow

		for _, emp := range teamMembers {
			// 1. Calculate total shifts hours for target month/year
			shifts, err := db.Shifts().GetByAssignedTo(emp.Phone)
			totalHours := 0.0
			if err == nil {
				for _, s := range shifts {
					// Date format: DD/MM/YYYY
					if len(s.Date) == 10 && s.Date[3:5] == month && s.Date[6:10] == year && s.Type == "reported" && s.Status == "approved" {
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

			reports = append(reports, domain.EmployeeReportRow{
				Phone:       emp.Phone,
				FullName:    emp.FullName,
				TotalHours:  totalHours,
				TotalTravel: totalTravel,
			})
		}

		createdTime := now.Format("2006-01-02T15:04:05Z")
		meta := domain.ReportMeta{
			CompanyName: "מרכזים לצדק חברתי",
			Year:        year,
			Month:       month,
			CreatedAt:   createdTime,
		}

		maker := domain.NewReportMaker(&domain.XLSFormat{})
		reportBytes, err := managerEmp.ExportShifts(maker, reports, meta)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "שגיאה ביצירת הדוח"})
			return
		}

		// Preserve exact headers for the frontend download
		c.Header("Content-Type", "application/vnd.ms-excel; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=michpal_export_%s_%s.xls", year, month))
		c.Data(http.StatusOK, "application/vnd.ms-excel; charset=utf-8", reportBytes)
	}
}

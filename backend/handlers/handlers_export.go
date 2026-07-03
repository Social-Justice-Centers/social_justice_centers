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

package domain

import "fmt"

// XLSFormat generates SpreadsheetML XML documents (.xls) for payroll export.
type XLSFormat struct{}

// Format produces a SpreadsheetML XML byte slice.
func (x *XLSFormat) Format(rows []EmployeeReportRow, meta ReportMeta) ([]byte, error) {
	// Build per-employee data rows.
	rowsXml := ""
	for _, r := range rows {
		rowsXml += fmt.Sprintf(`   <Row ss:Height="20">
    <Cell><Data ss:Type="String">%s</Data></Cell>
    <Cell><Data ss:Type="String">%s</Data></Cell>
    <Cell><Data ss:Type="Number">%.2f</Data></Cell>
    <Cell><Data ss:Type="Number">%.2f</Data></Cell>
    </Row>
`, r.Phone, r.FullName, r.TotalHours, r.TotalTravel)
	}

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
    <Cell><Data ss:Type="String">%s</Data></Cell>
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
</Workbook>`, meta.CreatedAt, meta.CompanyName, meta.Year, meta.Month, rowsXml)

	return []byte(xmlContent), nil
}

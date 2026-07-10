package domain

import "fmt"

// XLSFormat is a concrete Strategy that implements ReportFormat by generating
// a SpreadsheetML XML document (.xls).  This is the exact same format and
// logic used by the legacy ExportMichpalHandler.
//
// Hebrew / RTL handling:
//   - The XML declaration specifies encoding="utf-8", so all Hebrew characters
//     are encoded natively in UTF-8 — no code-page conversion is needed.
//   - The <WorksheetOptions> block includes <DisplayRightToLeft/>, which
//     instructs Excel to render the sheet from right to left, matching the
//     natural reading direction for Hebrew.
//   - Hebrew string literals (column headers, company name) are embedded
//     directly in the Go source as UTF-8 runes and appear verbatim in the
//     output.
type XLSFormat struct{}

// Format produces a SpreadsheetML XML byte slice.  The output is identical in
// structure to what ExportMichpalHandler generates.
//
// The generated workbook contains a single worksheet "Michpal Import" with:
//   - Row 1: company header labels (חברה, שנת מס, חודש דיווח).
//   - Row 2: company name, year, month values.
//   - Row 3: spacer.
//   - Row 4: column headers (תעודת זהות, שם עובד, שעות עבודה, נסיעות).
//   - Rows 5+: one row per EmployeeReportRow.
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

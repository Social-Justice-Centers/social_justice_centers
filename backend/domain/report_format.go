package domain

// ReportFormat is the Strategy interface for the report-export pattern.
// Each concrete strategy encodes shift and payroll data into a specific file
// format (e.g. SpreadsheetML/XLS, CSV, PDF).
type ReportFormat interface {
	// Format serialises the given report rows into a byte slice representing
	// the target file format.  The returned bytes are ready to be written to
	// an HTTP response or saved to disk.
	//
	// Parameters:
	//   rows  – per-employee aggregated data to export.
	//   meta  – report-level metadata (company name, month, year, etc.).
	//
	// Implementations MUST handle Hebrew text correctly — that means using
	// UTF-8 encoding (with BOM for CSV) and, where the format supports it,
	// enabling RTL display.
	Format(rows []EmployeeReportRow, meta ReportMeta) ([]byte, error)
}

// EmployeeReportRow holds the aggregated data for a single employee that
// appears as one row in an exported payroll report.  This mirrors the
// anonymous struct used inside the legacy ExportMichpalHandler.
type EmployeeReportRow struct {
	Phone       string  // Employee phone (used as ID column).
	FullName    string  // Display name (may contain Hebrew).
	TotalHours  float64 // Sum of approved work hours for the period.
	TotalTravel float64 // Sum of approved driving-report costs for the period.
}

// ReportMeta carries report-level information that is rendered in the header
// section of the exported file.
type ReportMeta struct {
	CompanyName string // e.g. "מרכזים לצדק חברתי".
	Year        string // Four-digit year, e.g. "2026".
	Month       string // Two-digit month, e.g. "07".
	CreatedAt   string // ISO 8601 timestamp for the document metadata.
}

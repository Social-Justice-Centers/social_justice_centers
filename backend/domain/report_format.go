package domain

// ReportFormat is the interface for report export strategies.
type ReportFormat interface {
	// Format serialises the given report rows into a byte slice.
	Format(rows []EmployeeReportRow, meta ReportMeta) ([]byte, error)
}

// EmployeeReportRow holds aggregated data for a single employee.
type EmployeeReportRow struct {
	Phone       string  // Employee phone (used as ID column).
	FullName    string  // Display name (may contain Hebrew).
	TotalHours  float64 // Sum of approved work hours for the period.
	TotalTravel float64 // Sum of approved driving-report costs for the period.
}

// ReportMeta carries report-level information.
type ReportMeta struct {
	CompanyName string // e.g. "מרכזים לצדק חברתי".
	Year        string // Four-digit year, e.g. "2026".
	Month       string // Two-digit month, e.g. "07".
	CreatedAt   string // ISO 8601 timestamp for the document metadata.
}

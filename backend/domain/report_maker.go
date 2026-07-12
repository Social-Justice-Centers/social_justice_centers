package domain

// ReportMaker holds a ReportFormat strategy and delegates file generation.
type ReportMaker struct {
	format ReportFormat
}

// NewReportMaker creates a ReportMaker configured with the given strategy.
func NewReportMaker(format ReportFormat) *ReportMaker {
	return &ReportMaker{format: format}
}

// SetFormat replaces the current export strategy.
func (rm *ReportMaker) SetFormat(format ReportFormat) {
	rm.format = format
}

// MakeReport delegates to the configured ReportFormat strategy.
func (rm *ReportMaker) MakeReport(rows []EmployeeReportRow, meta ReportMeta) ([]byte, error) {
	return rm.format.Format(rows, meta)
}

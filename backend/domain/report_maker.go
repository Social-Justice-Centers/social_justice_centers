package domain

// ReportMaker is the Context in the Strategy pattern.  It holds a reference
// to a ReportFormat strategy and delegates the actual file generation to it.
// Callers can swap the strategy at runtime to produce different output formats
// (XLS, CSV, PDF, …) without changing the calling code.
type ReportMaker struct {
	format ReportFormat
}

// NewReportMaker creates a ReportMaker configured with the given strategy.
func NewReportMaker(format ReportFormat) *ReportMaker {
	return &ReportMaker{format: format}
}

// SetFormat replaces the current export strategy.  This allows the same
// ReportMaker instance to be reused for multiple formats across its lifetime.
func (rm *ReportMaker) SetFormat(format ReportFormat) {
	rm.format = format
}

// MakeReport delegates to the configured ReportFormat strategy, passing
// through the aggregated employee rows and report metadata.
func (rm *ReportMaker) MakeReport(rows []EmployeeReportRow, meta ReportMeta) ([]byte, error) {
	return rm.format.Format(rows, meta)
}

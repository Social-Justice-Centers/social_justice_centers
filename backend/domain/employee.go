package domain

import "fmt"

// Employee is the Composite-pattern leaf node.  It represents a worker who
// does not manage anyone.  The struct wraps the same data that lives in
// models.User today but exposes it through the Employable interface.
//
// IMPORTANT: This struct coexists alongside models.User.  HTTP handlers
// continue to use models.User directly until the full migration is performed.
type Employee struct {
	ID              uint   // Database primary key (matches models.User.ID).
	FullName        string // Display name.
	Phone           string // Unique login identifier.
	Email           string
	Birthday        string // DD/MM/YYYY.
	DirectManagerID uint   // DB ID of the manager User record.
	IsFlexibleModel bool
	IsRegularModel  bool
}

// ---------------------------------------------------------------------------
// Employable implementation (leaf — no subordinates)
// ---------------------------------------------------------------------------

func (e *Employee) GetID() uint              { return e.ID }
func (e *Employee) GetFullName() string       { return e.FullName }
func (e *Employee) GetPhone() string          { return e.Phone }
func (e *Employee) GetRole() string           { return "employee" }
func (e *Employee) GetDirectManagerID() uint  { return e.DirectManagerID }

// ReportOnShift records a shift for this employee.
// The actual persistence will be wired in when the Abstract Factory (Shift)
// pattern is introduced; for now this is a no-op stub that returns nil.
func (e *Employee) ReportOnShift(_ ReportableShift) error {
	// TODO: delegate to the shift factory / store once available.
	return nil
}

// ---------------------------------------------------------------------------
// Saveable implementation
// ---------------------------------------------------------------------------

// TableName satisfies domain.Saveable and maps to the same table used by
// models.User so that both old and new code paths target the same storage.
func (e *Employee) TableName() string { return "users" }

// ---------------------------------------------------------------------------
// Stringer (debugging / logging)
// ---------------------------------------------------------------------------

func (e *Employee) String() string {
	return fmt.Sprintf("Employee{ID:%d, Name:%q, Phone:%q}", e.ID, e.FullName, e.Phone)
}

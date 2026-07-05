package domain

// Employable is the Component interface of the Composite pattern for the
// employee hierarchy.  Both leaf nodes (Employee) and composite nodes (Manager)
// implement this interface, allowing business logic to treat individuals and
// teams uniformly.
type Employable interface {
	// GetID returns the unique database identifier for this person.
	GetID() uint

	// GetFullName returns the person's display name.
	GetFullName() string

	// GetPhone returns the person's phone number (the primary login key).
	GetPhone() string

	// GetRole returns the person's role within the system ("employee" or
	// "manager").
	GetRole() string

	// ReportOnShift records a shift for this person.  The concrete
	// implementation decides how the shift is persisted or validated.
	ReportOnShift(shift ReportableShift) error

	// GetDirectManagerID returns the database ID of this person's direct
	// manager.  For a top-level manager who manages themselves, this equals
	// their own ID.
	GetDirectManagerID() uint
}

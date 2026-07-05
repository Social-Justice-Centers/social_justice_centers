package domain

import "fmt"

// Manager is the Composite-pattern composite node.  It represents a user who
// manages other employees.
//
// COMPOSITE DESIGN NOTE — Relational, not In-Memory:
// A classic Composite stores children in a slice inside the parent.  This
// system instead uses a relational foreign-key approach: every user record
// carries a DirectManager ID that points to its manager.  Subordinates are
// therefore resolved *dynamically* via a database query
// (UserStore.GetByDirectManagerID) rather than held in memory.
//
// This preserves the existing data model and keeps the source of truth in the
// database, which is essential for concurrent multi-server deployments.
//
// IMPORTANT: This struct coexists alongside models.User.  HTTP handlers
// continue to use models.User directly until the full migration is performed.
type Manager struct {
	ID              uint   // Database primary key (matches models.User.ID).
	FullName        string // Display name.
	Phone           string // Unique login identifier.
	Email           string
	Birthday        string // DD/MM/YYYY.
	DirectManagerID uint   // DB ID of this manager's own supervisor (self-referencing for top-level).
	IsFlexibleModel bool
	IsRegularModel  bool
}

// ---------------------------------------------------------------------------
// Employable implementation (composite — subordinates fetched dynamically)
// ---------------------------------------------------------------------------

func (m *Manager) GetID() uint              { return m.ID }
func (m *Manager) GetFullName() string       { return m.FullName }
func (m *Manager) GetPhone() string          { return m.Phone }
func (m *Manager) GetRole() string           { return "manager" }
func (m *Manager) GetDirectManagerID() uint  { return m.DirectManagerID }

// ReportOnShift records a shift for this manager.
// Managers can also have shifts (e.g. fieldwork).  Like Employee, the actual
// persistence is deferred to the Abstract Factory (Shift) phase.
func (m *Manager) ReportOnShift(_ ReportableShift) error {
	// TODO: delegate to the shift factory / store once available.
	return nil
}

// ExportShifts delegates report generation to the provided ReportMaker strategy.
func (m *Manager) ExportShifts(maker *ReportMaker, rows []EmployeeReportRow, meta ReportMeta) ([]byte, error) {
	return maker.MakeReport(rows, meta)
}

// SyncShiftToCalendar delegates calendar event creation to the provided
// CalendarService adapter.
func (m *Manager) SyncShiftToCalendar(calendar CalendarService, shift ReportableShift) error {
	return calendar.AddShiftToCalendar(shift)
}

// GetSubordinates dynamically fetches all employees whose DirectManager
// equals this manager's ID.  It relies on the existing relational mapping
// rather than an in-memory slice, preserving the current data architecture.
//
// The returned slice contains raw models.User values because the handler
// layer still operates on that type.  A future migration step will convert
// these into Employable instances.
func (m *Manager) GetSubordinates(users UserStore) ([]Employable, error) {
	raw, err := users.GetByDirectManagerID(m.ID)
	if err != nil {
		return nil, fmt.Errorf("fetching subordinates for manager %d: %w", m.ID, err)
	}

	subs := make([]Employable, 0, len(raw))
	for i := range raw {
		u := raw[i]
		subs = append(subs, userToEmployable(&u))
	}
	return subs, nil
}

// ---------------------------------------------------------------------------
// Saveable implementation
// ---------------------------------------------------------------------------

// TableName satisfies domain.Saveable and maps to the same table used by
// models.User.
func (m *Manager) TableName() string { return "users" }

// ---------------------------------------------------------------------------
// Stringer (debugging / logging)
// ---------------------------------------------------------------------------

func (m *Manager) String() string {
	return fmt.Sprintf("Manager{ID:%d, Name:%q, Phone:%q}", m.ID, m.FullName, m.Phone)
}

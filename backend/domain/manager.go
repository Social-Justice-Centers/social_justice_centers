package domain

import "fmt"

// Manager represents a user who manages other employees.
type Manager struct {
	ID              uint   // Database primary key (matches models.User.ID).
	FullName        string // Display name.
	Username        string // Display name (not unique).
	Phone           string // Unique login identifier.
	Email           string
	Birthday        string // DD/MM/YYYY.
	DirectManagerID uint   // DB ID of this manager's own supervisor (self-referencing for top-level).
	IsFlexibleModel bool
	IsRegularModel  bool
}



func (m *Manager) GetID() uint              { return m.ID }
func (m *Manager) GetFullName() string       { return m.FullName }
func (m *Manager) GetPhone() string          { return m.Phone }
func (m *Manager) GetRole() string           { return "manager" }
func (m *Manager) GetDirectManagerID() uint  { return m.DirectManagerID }

// ReportOnShift records a shift for this manager.
func (m *Manager) ReportOnShift(_ ReportableShift) error {
	return nil
}


func (m *Manager) ExportShifts(maker *ReportMaker, rows []EmployeeReportRow, meta ReportMeta) ([]byte, error) {
	return maker.MakeReport(rows, meta)
}

func (m *Manager) SyncShiftToCalendar(calendar CalendarService, shift ReportableShift) error {
	return calendar.AddShiftToCalendar(shift)
}

// ApproveShift updates a shift's status to approved or rejected.
func (m *Manager) ApproveShift(shift ReportableShift, isApproved bool) error {
	if isApproved {
		shift.SetStatus("approved")
	} else {
		shift.SetStatus("rejected")
	}
	return nil
}

// GetSubordinates fetches all employees managed by this manager.
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

func (m *Manager) TableName() string { return "users" }



func (m *Manager) String() string {
	return fmt.Sprintf("Manager{ID:%d, Name:%q, Phone:%q}", m.ID, m.FullName, m.Phone)
}

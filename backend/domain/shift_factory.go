package domain

import "fmt"

// ShiftFactory is the Abstract Factory interface for creating ReportableShift
// instances.  Callers request a shift by type name and a generic data map,
// and the factory returns the correct concrete struct without exposing the
// creation details.
type ShiftFactory interface {
	// CreateShift builds a ReportableShift of the given shiftType
	// ("regular" or "flexible") populated from data.
	//
	// Expected keys in data (all optional except where noted):
	//   "assignedTo"  string  — phone of the employee   (required)
	//   "assignedBy"  string  — phone of the manager    (required)
	//   "date"        string  — DD/MM/YYYY              (required)
	//   "startTime"   string  — HH:MM
	//   "endTime"     string  — HH:MM
	//   "workDuration"string  — e.g. "4h30m" (flexible only)
	//   "notes"       string
	//   "type"        string  — "planned" or "reported" (required)
	//   "status"      string  — default "approved"
	CreateShift(shiftType string, data map[string]interface{}) (ReportableShift, error)
}

// ---------------------------------------------------------------------------
// DefaultShiftFactory — concrete factory
// ---------------------------------------------------------------------------

// DefaultShiftFactory is the production implementation of ShiftFactory.  It
// maps shift-type strings to the corresponding concrete domain structs.
type DefaultShiftFactory struct{}

// NewDefaultShiftFactory returns a ready-to-use DefaultShiftFactory.
func NewDefaultShiftFactory() ShiftFactory {
	return &DefaultShiftFactory{}
}

// CreateShift instantiates a RegularShift or FlexibleShift based on
// shiftType and populates it from the provided data map.
func (f *DefaultShiftFactory) CreateShift(shiftType string, data map[string]interface{}) (ReportableShift, error) {
	switch shiftType {
	case "regular":
		return f.createRegularShift(data), nil
	case "flexible":
		return f.createFlexibleShift(data), nil
	default:
		return nil, fmt.Errorf("unknown shift type: %q", shiftType)
	}
}

// createRegularShift extracts values from the data map into a RegularShift.
func (f *DefaultShiftFactory) createRegularShift(data map[string]interface{}) *RegularShift {
	return &RegularShift{
		AssignedTo: stringFromMap(data, "assignedTo"),
		AssignedBy: stringFromMap(data, "assignedBy"),
		Date:       stringFromMap(data, "date"),
		StartTime:  stringFromMap(data, "startTime"),
		EndTime:    stringFromMap(data, "endTime"),
		Notes:      stringFromMap(data, "notes"),
		Type:       stringFromMap(data, "type"),
		Status:     stringOrDefault(data, "status", "approved"),
	}
}

// createFlexibleShift extracts values from the data map into a FlexibleShift.
func (f *DefaultShiftFactory) createFlexibleShift(data map[string]interface{}) *FlexibleShift {
	return &FlexibleShift{
		AssignedTo:   stringFromMap(data, "assignedTo"),
		AssignedBy:   stringFromMap(data, "assignedBy"),
		Date:         stringFromMap(data, "date"),
		StartTime:    stringFromMap(data, "startTime"),
		EndTime:      stringFromMap(data, "endTime"),
		WorkDuration: stringFromMap(data, "workDuration"),
		Notes:        stringFromMap(data, "notes"),
		Type:         stringFromMap(data, "type"),
		Status:       stringOrDefault(data, "status", "approved"),
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// stringFromMap safely extracts a string value from a map.  Returns "" if the
// key is missing or the value is not a string.
func stringFromMap(m map[string]interface{}, key string) string {
	v, ok := m[key]
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return s
}

// stringOrDefault is like stringFromMap but returns a fallback when the key is
// absent or empty.
func stringOrDefault(m map[string]interface{}, key, fallback string) string {
	s := stringFromMap(m, key)
	if s == "" {
		return fallback
	}
	return s
}

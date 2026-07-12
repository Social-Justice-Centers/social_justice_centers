package domain

import "fmt"

// ShiftFactory defines the interface for creating ReportableShift instances.
type ShiftFactory interface {
	CreateShift(shiftType string, data map[string]interface{}) (ReportableShift, error)
}

// DefaultShiftFactory is the production implementation of ShiftFactory.
type DefaultShiftFactory struct{}

// NewDefaultShiftFactory returns a ready-to-use DefaultShiftFactory.
func NewDefaultShiftFactory() ShiftFactory {
	return &DefaultShiftFactory{}
}

// CreateShift instantiates a RegularShift or FlexibleShift from the data map.
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
	shift := &RegularShift{
		AssignedTo:   stringFromMap(data, "assignedTo"),
		AssignedBy:   stringFromMap(data, "assignedBy"),
		Date:         stringFromMap(data, "date"),
		StartTime:    stringFromMap(data, "startTime"),
		EndTime:      stringFromMap(data, "endTime"),
		Notes:        stringFromMap(data, "notes"),
		Type:         stringFromMap(data, "type"),
		Status:       stringOrDefault(data, "status", "approved"),
		ReminderSent: boolFromMap(data, "reminderSent"),
	}
	if idVal, ok := data["id"]; ok {
		if idUint, ok := idVal.(uint); ok {
			shift.ID = idUint
		}
	}
	return shift
}

// createFlexibleShift extracts values from the data map into a FlexibleShift.
func (f *DefaultShiftFactory) createFlexibleShift(data map[string]interface{}) *FlexibleShift {
	shift := &FlexibleShift{
		AssignedTo:   stringFromMap(data, "assignedTo"),
		AssignedBy:   stringFromMap(data, "assignedBy"),
		Date:         stringFromMap(data, "date"),
		StartTime:    stringFromMap(data, "startTime"),
		EndTime:      stringFromMap(data, "endTime"),
		WorkDuration: stringFromMap(data, "workDuration"),
		Notes:        stringFromMap(data, "notes"),
		Type:         stringFromMap(data, "type"),
		Status:       stringOrDefault(data, "status", "approved"),
		ReminderSent: boolFromMap(data, "reminderSent"),
	}
	if idVal, ok := data["id"]; ok {
		if idUint, ok := idVal.(uint); ok {
			shift.ID = idUint
		}
	}
	return shift
}



func stringFromMap(m map[string]interface{}, key string) string {
	v, ok := m[key]
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return s
}

func stringOrDefault(m map[string]interface{}, key, fallback string) string {
	s := stringFromMap(m, key)
	if s == "" {
		return fallback
	}
	return s
}

func boolFromMap(data map[string]interface{}, key string) bool {
	if val, ok := data[key]; ok {
		if b, ok := val.(bool); ok {
			return b
		}
	}
	return false
}

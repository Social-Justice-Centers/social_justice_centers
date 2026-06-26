package Initialization

import (
	"log"
	"time"

	"my-backend/domain"
	"my-backend/utils"
)

// StartCronJobs starts all background tasks.
func StartCronJobs(db domain.Registry) {
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()

		for {
			<-ticker.C
			checkAndSendReminders(db)
		}
	}()
}

func checkAndSendReminders(db domain.Registry) {
	// Find all active shifts
	activeShifts, err := db.Shifts().GetAllActiveShifts()
	if err != nil {
		log.Printf("checkAndSendReminders: Failed to fetch active shifts: %v", err)
		return
	}

	now := utils.Now()

	for _, active := range activeShifts {
		// Only check reported active shifts (clocked in)
		if active.Type != "reported" || active.ReminderSent {
			continue
		}

		// Find a planned shift for this employee today
		plannedShifts, err := db.Shifts().GetByAssignedToInDateRange(active.AssignedTo, active.Date, active.Date)
		if err != nil {
			continue
		}

		for _, p := range plannedShifts {
			if p.Type == "planned" && p.EndTime != "" {
				t, err := time.Parse("15:04", p.EndTime)
				if err != nil {
					continue
				}

				plannedEnd := time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, now.Location())
				
				// Check if 30 minutes have passed since the planned end time
				if now.Sub(plannedEnd).Minutes() >= 30 {
					user, err := db.Users().GetByPhone(active.AssignedTo)
					if err == nil && user.Email != "" {
						err := SendReminderEmail(user.Email)
						if err != nil {
							log.Printf("checkAndSendReminders: Failed to send email to %s: %v", user.Email, err)
						} else {
							// Update ReminderSent
							active.ReminderSent = true
							_ = db.Shifts().Update(&active)
							log.Printf("checkAndSendReminders: Sent reminder to %s", user.Email)
						}
					}
					break // Only check once per active shift
				}
			}
		}
	}
}

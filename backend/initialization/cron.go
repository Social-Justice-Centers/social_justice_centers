package Initialization

import (
	"log"
	"time"

	"my-backend/domain"
	"my-backend/handlers"
	"my-backend/utils"
)

// StartCronJobs starts all background tasks.
func StartCronJobs(db domain.Registry) {
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()

		for {
			<-ticker.C
			checkAndSendReminders(db)
			checkAndSendUpcomingShiftReminders(db)
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
				plannedEnd, err := time.ParseInLocation("02/01/2006 15:04", p.Date+" "+p.EndTime, now.Location())
				if err != nil {
					continue
				}
				
				// Check if 30 minutes have passed since the planned end time
				if now.Sub(plannedEnd).Minutes() >= 30 {
					user, err := db.Users().GetByPhone(active.AssignedTo)
					if err == nil && user.Email != "" {
						err := handlers.SendReminderEmail(user.Email)
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

func checkAndSendUpcomingShiftReminders(db domain.Registry) {
	plannedShifts, err := db.Shifts().GetAllPlannedShifts()
	if err != nil {
		log.Printf("checkAndSendUpcomingShiftReminders: Failed to fetch planned shifts: %v", err)
		return
	}

	now := utils.Now()

	for _, p := range plannedShifts {
		if p.StartTime == "" {
			continue
		}

		startTime, err := time.ParseInLocation("02/01/2006 15:04", p.Date+" "+p.StartTime, now.Location())
		if err != nil {
			continue
		}

		diff := startTime.Sub(now)
		if diff.Minutes() <= 30 && diff.Minutes() > 0 {
			user, err := db.Users().GetByPhone(p.AssignedTo)
			if err == nil && user.Email != "" {
				err := handlers.SendUpcomingShiftEmail(user.Email, p.Date, p.StartTime)
				if err != nil {
					log.Printf("checkAndSendUpcomingShiftReminders: Failed to send email to %s: %v", user.Email, err)
				} else {
					p.ReminderSent = true
					_ = db.Shifts().Update(&p)
					log.Printf("checkAndSendUpcomingShiftReminders: Sent upcoming shift reminder to %s for shift at %s %s", user.Email, p.Date, p.StartTime)
				}
			}
		}
	}
}

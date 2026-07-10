package domain

import "my-backend/models"

// userToEmployable converts a legacy models.User into the appropriate
// Employable implementation (Employee or Manager) based on the user's Role.
//
// This bridge function allows the new domain types to coexist with the
// existing models.User without requiring handler changes.
func userToEmployable(u *models.User) Employable {
	switch u.Role {
	case models.RoleManager:
		return &Manager{
			ID:              u.ID,
			FullName:        u.FullName,
			Username:        u.Username,
			Phone:           u.Phone,
			Email:           u.Email,
			Birthday:        u.Birthday,
			DirectManagerID: u.DirectManager,
			IsFlexibleModel: u.IsFlexibleModel,
			IsRegularModel:  u.IsRegularModel,
		}
	default: // RoleEmployee or any unknown role
		return &Employee{
			ID:              u.ID,
			FullName:        u.FullName,
			Username:        u.Username,
			Phone:           u.Phone,
			Email:           u.Email,
			Birthday:        u.Birthday,
			DirectManagerID: u.DirectManager,
			IsFlexibleModel: u.IsFlexibleModel,
			IsRegularModel:  u.IsRegularModel,
		}
	}
}

// UserToEmployable is the exported version of userToEmployable, available to
// other packages that need to bridge between models.User and the new domain
// hierarchy.
func UserToEmployable(u *models.User) Employable {
	return userToEmployable(u)
}

package domain

import "my-backend/models"

// userToEmployable converts a models.User into the appropriate Employable.
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

// UserToEmployable is the exported version of userToEmployable.
func UserToEmployable(u *models.User) Employable {
	return userToEmployable(u)
}

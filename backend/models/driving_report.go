package models

import "gorm.io/gorm"

type DrivingReport struct {
	gorm.Model
	UserPhone   string  `gorm:"not null"      json:"userPhone"`
	Date        string  `json:"date"`
	Description string  `json:"description"`
	TotalCost   float64 `json:"totalCost"`
	FilePath    string  `json:"filePath"`
	FileName    string  `json:"fileName"`
	Approved    bool    `gorm:"default:false" json:"approved"`
	ApprovedBy  string  `json:"approvedBy"`
}

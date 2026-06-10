package main

import (
	"log"

	"my-backend/initialization"
	"my-backend/storage"
)

func main() {
	db := Initialization.InitDB()
	registry := storage.NewSQLiteRegistry(db)
	
	Initialization.StartCronJobs(registry)
	
	r := Initialization.SetupRouter(registry)

	log.Println("Server is running on port 8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}
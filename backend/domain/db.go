package domain

// Saveable is a marker interface for any persistable entity.
type Saveable interface {
	TableName() string
}

// DB is a high-level abstraction over database operations.
type DB interface {
	SaveToDB(s Saveable) error
	Registry() Registry
}

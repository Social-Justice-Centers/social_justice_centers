package domain

// Saveable is a marker interface for any entity that can be persisted to a
// database.  Models (e.g. User, Shift) will implement this interface in a
// future step, decoupling persistence logic from concrete struct types.
type Saveable interface {
	// TableName returns the database table associated with the entity.
	TableName() string
}

// DB is a high-level abstraction over database operations.  It allows the
// application to swap storage backends (MySQL, SQLite, PostgreSQL, …) without
// changing business logic.
//
// Concrete adapters live in the storage package and implement this interface on
// top of a specific driver (e.g. mysqlRegistry wraps gorm + MySQL).
type DB interface {
	// SaveToDB persists the given Saveable entity.  Implementations decide
	// whether to INSERT or UPSERT based on the underlying driver semantics.
	SaveToDB(s Saveable) error

	// Registry returns the store aggregate so callers can still access the
	// fine-grained per-entity stores.
	Registry() Registry
}

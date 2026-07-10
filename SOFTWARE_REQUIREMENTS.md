# Software Requirements

## Recommended (via Docker)
To run the application easily using the provided containers, you only need:
- **Docker**
- **Make**
- **Git**

*Note: The Docker containers automatically pull and use the following environments:*
- **Database:** MySQL 8.0
- **Backend:** Go 1.24 (Alpine)
- **Frontend:** Node.js 20 (Alpine)

## Local Development (Without Docker)
If you wish to run the services directly on your host machine, you will need:

### Backend
- **Go** (Version 1.24+) - *All Go packages are managed automatically via `go.mod`.*

### Frontend
- **Node.js** (Version 20+) - *All Next.js dependencies are managed automatically via `package.json`.*

### Database
- **MySQL** (Version 8.0+)

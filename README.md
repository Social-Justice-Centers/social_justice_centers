# Social Justice Centers - Employee Management System

## 📚 About Social Justice Centers
**Social Justice Centersr** is a national grassroots movement with local branches across Israel that empowers citizens to take an active role in their communities. The organization emphasizes democratic values, local leadership development, and community-driven social change.

The Social Justice Centers movement employs staff across multiple locations. Currently, shift reporting is an inconvenient process. We are developing an accessible app to track shifts and manage roles.

### Key Objectives
- **Unification:** Combine entry/exit time recording and job role logging into one streamlined app.
- **Management:** Provide managers with tools to approve shifts, and export data for salary/reward calculations.
---

## ✨ Features

### For Employees
- **Unified Login:** Simple authentication via phone number.
- **Shift Tracking:** Easy Clock-in/Clock-out interface.
- **Expense Claims:** Upload travel expense documents.

### For Managers
- **Shift Scheduling:** Assign shifts to employees with Google Calendar integration.
- **Shift Verification:** Review, approve, or reject submitted shifts.
- **Expense Verification:** Review, approve, or reject submitted travel expenses.
- **Reports:** Export detailed reports for monthly salary and reward calculations.
- **User Management:** Add employees and assign permissions.

---

## 🛠️ Technology Stack

This project is built using a modern, scalable architecture designed for high performance and reliability.

### Backend
- **Language:** Go (Golang)
- **Framework:** Gin-Gonic
- *Chosen for high execution speed, low resource consumption, and ability to handle high concurrency.*

### Frontend
- **Framework:** Next.js (React)
- *Chosen for server-side rendering capabilities, performance, and modern mobile-first UI development.*

### Database
- **Database:** MySQL
- *Chosen for ACID compliance and strong SQL capabilities to ensure data integrity for financial/reward calculations.*
- *Designed to allow easily swapping the database type if required.*

### Infrastructure & DevOps
- **Containerization:** Docker & Docker Compose
- **CI/CD:** Automated pipelines for linting, testing, and building production images.

---

## 🏗️ Architecture Overview

The system follows a microservices-oriented approach:
- **Application (Client):** Next.js frontend interacting with the API.
- **API Server:** Go/Gin server handling business logic, authentication, and shift management.
- **Database:** MySQL instance storing sensitive user data, shifts, and roles.

---

## 💻 Minimal System Requirements

To run the application and database containers smoothly, ensure your host environment meets the following specifications:

- **OS:** Linux (Ubuntu/Debian recommended) or Windows with WSL2
- **CPU:** 1 vCPU (Core)
- **RAM:** 2 GB
- **Storage:** 10 GB of available disk space (Note: Storage requirements will grow as database records and logs accumulate)

*For a full list of software dependencies, please refer to [SOFTWARE_REQUIREMENTS.md](SOFTWARE_REQUIREMENTS.md).*

---

## 🚀 Getting Started

Getting the project up and running locally is simple. You don't need to install Node.js, Go, or any other dependencies on your host machine other than **Docker**, **Make** and **Git**.

1. **Install Prerequisites (if needed):**
   For Ubuntu-based systems, run:
   ```bash
   sudo apt update
   sudo apt install -y git make docker.io
   ```
   
2. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd social_justice_centers
   ```

3. **Start the application:**
   ```bash
   make run
   ```
   *This command will build the Docker images and start both the Next.js frontend and Go backend in the background. It will also attempt to open `http://localhost:3000` in your browser automatically.*

### Useful Developer Commands
- `make run`: Build and start all services.
- `make stop`: Stop all running services.
- `make logs`: View the combined logs of the frontend and backend.
- `make build`: Force a clean rebuild of the Docker images.
- `make image-frontend`: Build a standalone frontend image.
- `make image-backend`: Build a standalone backend image.

---

## 👥 The Team

This project was designed and developed by:

- Yanai Zehavi
- Matan Gerstman
- Rotem Harel
- Yoav Fuchs
- Noya De Levi
- Dor Chobotaro

**Instructor:**
- Diana Cohen

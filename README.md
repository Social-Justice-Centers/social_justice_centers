# Social Justice Centers - Employee Management System

## 📚 About Social Justice Centers
**Social Justice Centersr** is a national grassroots movement with local branches across Israel that empowers citizens to take an active role in their communities. The organization emphasizes democratic values, local leadership development, and community-driven social change.

The Social Justice Centers movement employs staff across multiple locations. Currently, shift reporting is an inconvenient process. We are developing an accessible app to track shifts and manage roles.

### Key Objectives
- **Unification:** Combine entry/exit time recording and job role logging into one streamlined app.
- **Management:** Provide managers with tools to approve shifts, manage locations, and export data for salary/reward calculations.
---

## ✨ Features

### For Employees
- **Unified Login:** Simple authentication via phone number and password.
- **Shift Tracking:** Easy Clock-in/Clock-out interface.
- **Role Reporting:** Mandatory selection of specific job roles and details during the shift.
- **Accessibility:** User interface optimized for ease of use and accessibility.

### For Managers
- **Dashboard:** Manage multiple store locations and user roles.
- **Shift Verification:** Review, approve, or reject submitted shifts.
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
- **Database:** PostgreSQL
- *Chosen for ACID compliance and strong SQL capabilities to ensure data integrity for financial/reward calculations.*

### Infrastructure & DevOps
- **Containerization:** Docker & Docker Compose
- **CI/CD:** Automated pipelines for linting, testing, and building production images.

---

## 🏗️ Architecture Overview

The system follows a microservices-oriented approach:
- **Application (Client):** Next.js frontend interacting with the API.
- **API Server:** Go/Gin server handling business logic, authentication, and shift management.
- **Database:** PostgreSQL instance storing sensitive user data, shifts, and roles.

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

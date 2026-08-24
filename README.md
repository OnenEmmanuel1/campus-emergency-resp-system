# CampusAlert (CERRS) - Campus Emergency Response and Reporting System

CampusAlert is a production-ready, full-stack Campus Emergency Response and Reporting System (CERRS) designed for tertiary institutions. The application separates core routing logic, severity assessment, and notification dispatch into a central processing engine (`engine/cersEngine.js`) and features a role-based workflow for Students/Staff, specialized Emergency Responders, and System Administrators.

## Stack Overview
- **Backend**: Node.js + Express.js
- **Frontend Templates**: HTML5 + EJS templating with shared partial layouts
- **Design System**: Strict solid-color flat CSS (no gradients) with CSS variables, Plus Jakarta Sans Typography, and `cers-` prefixes
- **Database**: MySQL 8.0 with normalized tables and strictly parameterized raw queries (via `mysql2/promise`)
- **Authentication**: `express-session` + `bcryptjs`
- **Location Capture**: Client-side browser-native Geolocation API (HTML5) with immediate dispatch and fallback options

---

## Default Seed Credentials

All pre-seeded accounts share the password: **`password123`**

| Role / Unit | Email Address | Purpose / Category Routing |
| :--- | :--- | :--- |
| **Administrator** | `admin@campusalert.edu` | Management Dashboard, User CRUD, CSV Exports |
| **Security Responder** | `security@campusalert.edu` | Routed category `security` & `other` alerts |
| **Medical Responder** | `medical@campusalert.edu` | Routed category `medical` & `accident` alerts |
| **Fire Responder** | `fire@campusalert.edu` | Routed category `fire` alerts |
| **Student Reporter (John)**| `john@campusalert.edu` | One-click helper, standard filing |
| **Student Reporter (Jane)**| `jane@campusalert.edu` | One-click helper, standard filing |
| **Staff Reporter (Charles)**| `charles@campusalert.edu` | One-click helper, standard filing |

---

## Geolocation API Usage & Fallbacks

CampusAlert gathers location coordinates using the browser-native W3C Geolocation API (`navigator.geolocation`) without requiring external active GPS receivers or proprietary trackers:
1. **One-Click emergency buttons**: Instantly queries browser coordinates and timestamps and immediately submits them, bypassing form details for speed.
2. **Standard Detailed Form**: Queries coordinates in the background on load and auto-populates input fields.
3. **Fallback Actions**: If the browser block permissions or fails, the script recovers gracefully:
   - It issues warning details in logs.
   - It defaults the coordinates to the Campus Center Center (`40.712776`, `-74.005974`) to prevent system crashes.
   - Responders will see the default mapped coordinates tagged as fallback location.

---

## Deployment & Setup

### Option 1: Docker Compose (Recommended)

1. Make sure you have **Docker** and **Docker Compose** installed.
2. Open terminal in the directory.
3. Start the containers (it will read `.env` values automatically):
   ```bash
   docker-compose up --build
   ```
4. Once container databases compile `schema.sql` and `seed.sql`, the application will start at:
   [http://localhost:3000](http://localhost:3000)

### Option 2: Local Installation (Manual)

1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Configure your local MySQL server and create a database named `campus_alert`.
3. Import `schema.sql` first, followed by `seed.sql` to populate accounts:
   ```bash
   mysql -u root -p campus_alert < schema.sql
   mysql -u root -p campus_alert < seed.sql
   ```

   ```
5. Spin up the local development environment:
   ```bash
   npm run start
   ```
6. Visit the app in your browser at: [http://localhost:3000](http://localhost:3000)

# TrueRepairs

**An AI-powered car repair cost estimator.** Upload photos of vehicle damage, and TrueRepairs identifies the damaged parts, rates the severity, and produces an itemized parts-and-labor estimate you can save as a PDF report.

Senior design project at Wayne State University (Fall 2025), built by a 4-person team.

---

## Features

- **AI damage scan:** upload one or more photos. The backend sends them to OpenAI's GPT-4o vision model, which identifies damaged parts and how severe the damage is.
- **Repair cost estimate:** maps detected damage to parts and labor using a cost table and vehicle-specific parts data.
- **Vehicle lookup:** make, model, and trim details through the API Ninjas car API, plus manual vehicle entry.
- **PDF reports:** export an estimate as a PDF (jsPDF + html2canvas). Past reports are saved to your account history.
- **User accounts:** registration, login, password reset by email (SendGrid), profile updates, and account deactivation or deletion. Routes are protected with JWT authentication, and passwords are hashed with bcrypt.
- **Image storage:** uploaded photos are handled with Multer and stored in Cloudinary.
- **API testing:** Postman collections for every major endpoint are in `server/postman_tests/`.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, React Router, Lucide icons, jsPDF, html2canvas |
| Backend | Node.js, Express, Multer |
| Database | MongoDB with Mongoose |
| AI & APIs | OpenAI API (GPT-4o vision), API Ninjas (vehicle data), SendGrid (email), Cloudinary (images) |
| Security | JWT authentication, bcrypt password hashing, environment-based secrets |
| Testing | Postman collections |

## My role (Hisham Issa)

Per our Development Plan and Test Plan, I held four roles on the team:

- **Team Lead:** coordinated the 4-person team and managed the project's progress from planning through delivery.
- **Documentation Lead:** created and organized all project documentation, including the SRS, SDS, Development Plan, Test Plan, Traceability Matrix, and User Manual.
- **AI Lead:** built the AI estimate feature end to end: the AI scan modal in React, image upload to Cloudinary, and the `/api/estimate` Express route that calls the OpenAI API, then tested the full flow from front end to back end.
- **Test Lead:** led testing for the project under the team's Test Plan.

I also integrated the vehicle database API and improved the AI scan flow, including fixing image upload.

## Team

- **Hisham Issa** ([@hi0012](https://github.com/hi0012)): team lead
- [@rawbert65](https://github.com/rawbert65)
- [@screencode1](https://github.com/screencode1)
- [@scalenetoast](https://github.com/scalenetoast)

> This repository is a copy of our team's project with its full commit history. Credentials were removed from the history before it was published.

---

## Running it locally

**Requirements:** Node.js 18 or newer.

### 1. Install dependencies

```bash
git clone https://github.com/hi0012/TrueRepairs.git
cd TrueRepairs
npm install            # frontend
cd server && npm install   # backend
```

### 2. Configure environment variables

Create `server/.env` with your own keys. Never commit this file.

```
MONGODB_URI=
MONGO_URI=              # same value as MONGODB_URI
OPENAI_API_KEY=
NINJA_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SENDGRID_API_KEY=
FROM_EMAIL=
CLIENT_URL=http://localhost:5173
TEMP_SECRET=
```

### 3. Start both servers

```bash
# Backend (from /server) – runs on http://localhost:5000
npm start

# Frontend (from the project root) – runs on http://localhost:5173
npm run dev
```
# TrueRepairs Project Documentation

These are the formal documents our team submitted for CSC 4996 (Senior Design) at Wayne State University in Fall 2025. As Documentation Lead, I (Hisham Issa) organized the full documentation set.

| Document | What it covers |
|---|---|
| [Software Requirements Specification (SRS)](TrueRepairs-SRS.pdf) | Functional and non-functional requirements, use cases, and system models |
| [Software Design Specification (SDS)](TrueRepairs-SDS.pdf) | Architecture, sequence and data flow diagrams, class and database design, API endpoints, UI design |
| [Development Plan](TrueRepairs-DevelopmentPlan.pdf) | Objectives, team organization and roles, problem resolution policies, schedule |
| [Test Plan](TrueRepairs-TestPlan.pdf) | Test strategy (black-box and gray-box), schedule, environment, entry and exit criteria, 51 test cases, risk analysis, defect management, test report |
| [Traceability Matrix](TrueRepairs-TraceabilityMatrix.csv) | Maps each requirement to its use case and test cases, with pass/fail results |
| [User Manual](TrueRepairs-UserManual.pdf) | Step-by-step guide to every feature, with screenshots |

## Team roles (from the Development Plan and Test Plan)

| Role | Member |
|---|---|
| Team Lead | Hisham |
| Documentation Lead | Hisham |
| AI Lead | Hisham |
| Test Lead | Hisham |
| QA / Presentation Lead | Robert |
| Frontend Lead | Ishmael / Robert |
| Database / Backend Lead | Jibran / Robert |

> Test account emails and passwords have been redacted from these public copies.


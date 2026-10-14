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

- **Team lead:** coordinated the 4-person team, managed the project's progress, and owned all project documentation (creating and organizing it).
- **AI estimate feature:** built it end to end. That covered the AI scan modal in React, image upload to Cloudinary, and the `/api/estimate` Express route that calls the OpenAI API, then tested the full flow from front end to back end.
- **Vehicle data:** integrated the vehicle database API.
- **UI work:** improved the AI scan flow and fixed image upload.

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

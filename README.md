# TrueRepairs

## Prerequisites

The TrueRepairs frontend is built using React + Vite, which requires Node.js v18 or higher.
Download and install Node.js here: https://nodejs.org/en

These tools are required to install and run the application.
Check installation:
```bash
node -v
npm -v
```
## Install Frontend Project Dependencies
After installing Node.js and cloning the repository, **make sure you are inside the root TrueRepairs folder,** then install all required dependencies by running:
```bash
npm install
```
### Install EVERYTHING in a Single Command Option 1
```bash
npm install axios html2canvas jsonwebtoken jspdf lucide-react mongodb react react-dom react-icons react-router-dom streamifier
```
### Install Each Dependency Individually Option 2
```bash
npm install axios
npm install html2canvas
npm install jsonwebtoken
npm install jspdf
npm install lucide-react
npm install mongodb
npm install react
npm install react-dom
npm install react-icons
npm install react-router-dom
npm install streamifier
```
## Install Backend Project Dependencies
After installing the frontend and ensuring everything works, navigate to the backend folder:
```bash
cd server
```
Once inside the /server directory, install all required backend dependencies by running:
```bash
npm install
```
### Install ALL Backend Dependencies in a Single Command Option 1
```bash
npm install @sendgrid/mail axios bcrypt bcryptjs cloudinary cors dotenv express jsonwebtoken lucide-react mongoose multer nodemon openai streamifier
``` 
### Install Each Backend Dependency Individually Option 2
```bash
npm install @sendgrid/mail
npm install axios
npm install bcrypt
npm install bcryptjs
npm install cloudinary
npm install cors
npm install dotenv
npm install express
npm install jsonwebtoken
npm install lucide-react
npm install mongoose
npm install multer
npm install nodemon
npm install openai
npm install streamifier
```
## ***How to Run the Project (Frontend + Backend)***
After installing all dependencies in both folders, follow these steps to launch the full application.
### 1. Start the Frontend (React + Vite)
From the root TrueRepairs folder:<br>
Development mode
```bash
npm run dev
```
**OR**<br>
Production build
```bash
npm run build
npm run preview
```
This launches the frontend at:
http://localhost:5173
### 2. Start the Backend (Node.js + Express)
Navigate to the server directory:
```bash
cd server
```
Run the backend: <br>
Using Nodemon
```bash
npm start
```
**OR**<br> Directly
```bash
node index.js
```
This launches the backend at:
http://localhost:5000

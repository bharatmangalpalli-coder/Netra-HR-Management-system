# HR Pro - Small Office Management System

A production-ready HR Management System designed for small offices (4-10 employees). This system features a comprehensive Admin Web Panel and a mobile-responsive Employee Portal.

## Features

### Admin Web Panel
- **Dashboard**: Real-time stats and performance charts.
- **Employee Management**: Full CRUD for employee records.
- **Attendance**: Daily/Monthly tracking with GPS location and selfie verification.
- **Leave Management**: Approve/Reject leave requests with history.
- **Task Management**: Assign tasks with priority, deadlines, and comments.
- **Salary & Payroll**: Monthly salary generation and PDF salary slips.

### Employee Portal (Mobile-Responsive)
- **Dashboard**: Today's attendance status and pending tasks.
- **Attendance**: Mark IN/OUT with GPS and selfie.
- **Tasks**: View assigned tasks, mark complete, and add comments.
- **Leaves**: Apply for leaves and track status.
- **Salary**: View payment history and download salary slips.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion.
- **Backend**: Firebase (Auth, Firestore, Storage).
- **Charts**: Recharts.
- **PDF Generation**: jsPDF.

## Setup Instructions

### 1. Firebase Setup
1. Create a new project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Email/Password** and **Phone** authentication.
3. Create a **Cloud Firestore** database in test mode (or configure rules).
4. Create a **Storage** bucket for selfies and profile photos.
5. Register a Web App and copy the configuration.

### 2. Authorized Domains
To use Phone Authentication, you must add your app's domains to the **Authorized Domains** list in the Firebase Console:
1. Go to **Authentication > Settings > Authorized Domains**.
2. Add the following:
   - `ais-dev-2cdiyvdvghnkpsjuizmrcv-102289886875.asia-southeast1.run.app`
   - `ais-pre-2cdiyvdvghnkpsjuizmrcv-102289886875.asia-southeast1.run.app`

### 3. Firestore Indexes
Firestore requires **Composite Indexes** for queries that filter by one field and sort by another. You must create the following indexes in **Firestore > Indexes**:
1. Collection: `attendance`, Fields: `date` (Asc), `inTime` (Desc)
2. Collection: `attendance`, Fields: `employeeId` (Asc), `date` (Desc)
3. Collection: `leaves`, Fields: `status` (Asc), `appliedAt` (Desc)
4. Collection: `leaves`, Fields: `employeeId` (Asc), `appliedAt` (Desc)
5. Collection: `tasks`, Fields: `assignedTo` (Asc), `createdAt` (Desc)

### 4. Environment Variables
Add the following to your `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Firestore Collections
The app expects the following collections:
- `admins`: Document ID should be the Admin's UID.
- `employees`: Document ID should be the Employee's UID.
- `attendance`: Daily records.
- `leaves`: Leave requests.
- `tasks`: Assigned tasks.
- `salary`: Monthly payroll records.

### 4. Initial Admin User
To create the first admin:
1. Sign up via the app.
2. Go to Firebase Console -> Firestore.
3. Create a document in the `admins` collection with the UID of the user you just created.

## Security Rules (Recommended)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /admins/{adminId} {
      allow read, write: if request.auth != null && request.auth.uid == adminId;
    }
    match /employees/{employeeId} {
      allow read: if request.auth != null;
      allow write: if exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    match /attendance/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    // Add similar rules for leaves, tasks, and salary
  }
}
```

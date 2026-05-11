# DLRSJAM — Digital Licence Renewal System (Jamaica)

DLRSJAM is a full-stack web application that digitises the driver's licence renewal process for Jamaica's Tax Administration Jamaica (TAJ). Applicants can submit renewal applications entirely online, upload identity documents, complete liveness verification, and pay the licence fee — while officers and supervisors review, approve, or escalate applications through dedicated portals.

---

## Table of Contents

- [Overview](#overview)
- [User Roles](#user-roles)
- [Application Flow](#application-flow)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Backend](#backend)
- [Frontend](#frontend)
- [Key Features](#key-features)
- [Data Protection](#data-protection)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Seeding the Database](#seeding-the-database)

---

## Overview

The system has three separate portals:

| Portal | Path | Users |
|---|---|---|
| Applicant portal | `/` | Citizens renewing a licence |
| Officer portal | `/officer` | TAJ processing officers |
| Supervisor portal | `/supervisor` | TAJ supervisors |

Applicants register by verifying their TRN and existing licence control number against the TAJ licence record database. Once verified they give explicit DPA consent then go through a multi-step application process. Officers receive applications in a queue, review documents, check liveness results, and make a decision. Supervisors can review escalated cases, manage officers, and have access to a broader queue.

---

## User Roles

**Applicant** — a registered citizen with an existing TAJ licence record. Can submit applications, upload documents, complete face verification, pay fees, and track application status. Can download a copy of their personal data and delete their account via Account Settings.

**Officer** — TAJ staff member. Reviews applications in the queue, checks identity documents and liveness verification results, sends requests for resubmission, and approves or rejects applications. Has a notification feed and can view a dashboard of their caseload.

**Supervisor** — Senior TAJ staff. Has all officer capabilities plus the ability to view escalated applications, manage officer accounts, upload a digital signature, and access cross-officer queue statistics.

---

## Application Flow

The applicant follows 10 sequential steps:

1. **Consent** — explicit DPA consent required before any data is collected
2. **Transaction Selection** — choose the transaction type (renewal, replacement, amendment)
3. **Retrieve Record** — pull existing TAJ licence record using TRN
4. **Confirm Transaction** — review pre-filled details from the licence record
5. **Supporting Changes** — declare any address or personal detail changes
6. **Document Upload** — upload National ID (front/back) and existing licence (front/back); OCR runs automatically on each image
7. **Liveness Verification** — multi-layer pipeline combining active challenge-response, passive signal analysis, deepfake detection, and face match against uploaded ID
8. **Review** — full summary of everything before submission
9. **Declaration** — legal declaration checkbox
10. **Payment** — Stripe card payment for the licence fee
11. **Success** — confirmation screen with application reference number

After submission the application enters the officer queue with status `PENDING`.

---

## Tech Stack

### Backend
- **Python / Flask** — REST API
- **SQLAlchemy + Flask-Migrate** — ORM and database migrations
- **PostgreSQL** — primary database
- **PyJWT** — JWT authentication
- **Tesseract OCR + pytesseract + OpenCV** — document OCR
- **Pillow** — image processing
- **DeepFace** — anti-spoof deepfake detection
- **Stripe** — payment processing
- **Gunicorn** — production WSGI server

### Frontend
- **React 19** — UI framework
- **Vite** — build tool and dev server
- **React Router v7** — client-side routing
- **Axios** — HTTP client
- **MediaPipe Face Mesh** — liveness detection (468 3D landmarks at 30fps)
- **face-api.js** — 128-dimension face descriptor extraction and face match
- **Stripe React SDK** — payment UI
- **jsPDF + dom-to-image-more** — digital licence PDF generation
- **Tailwind CSS** — utility styles
- **CSS Modules** — scoped component styles

---

## Project Structure

```
DLRSJAM/
├── backend/
│   ├── app.py                  # Flask app factory, blueprint registration, retention purge CLI
│   ├── config/
│   │   ├── extensions.py       # SQLAlchemy, migrate instances
│   │   └── settings.py         # Config class, env loading
│   ├── models/
│   │   ├── user.py
│   │   ├── role.py
│   │   ├── user_role.py
│   │   ├── applicant_profile.py
│   │   ├── licence_record.py   # TAJ licence records (source of truth for registration)
│   │   ├── application.py      # One row per renewal application, includes consent_given_at
│   │   ├── document.py         # Uploaded documents, OCR results, AI quality scores
│   │   ├── payment.py
│   │   ├── face_verification.py
│   │   ├── digital_licence.py
│   │   ├── notification.py
│   │   ├── application_event.py
│   │   ├── ita_correspondence.py
│   │   ├── officer_profile.py
│   │   ├── supervisor_profile.py
│   │   └── collectorate.py
│   ├── routes/
│   │   ├── auth.py             # Login, register verify/complete, /me, change-password
│   │   ├── applicant.py        # Application steps, dashboard, data export, account deletion
│   │   ├── officer.py          # Officer queue, review, decisions
│   │   ├── supervisor.py       # Supervisor queue, officer management, signature
│   │   ├── notifications.py    # Notification endpoints for all roles
│   │   ├── verification.py     # DeepFace anti-spoof endpoint
│   │   ├── shared.py           # Shared endpoints (collectorates, etc.)
│   │   └── admin.py            # Admin utilities
│   ├── services/
│   │   ├── assignment_service.py   # Auto-assigns applications to officers
│   │   └── security_service.py    # Security checks
│   └── utils/
│       ├── auth.py             # JWT decode decorators (require_officer, etc.)
│       ├── ocr.py              # Tesseract OCR for NID and licence images
│       ├── assignment.py       # Assignment logic helpers
│       └── seeds/              # Seed scripts for dev data
│
└── frontend/
    ├── public/
    │   └── models/             # face-api.js model weights
    └── src/
        ├── App.jsx             # Route definitions
        ├── context/
        │   ├── AuthContext.jsx         # Auth state, login/logout, role checks
        │   └── ApplicationContext.jsx  # Multi-step application form state
        ├── services/
        │   ├── api.js                  # Axios instance with auth headers
        │   └── authService.js         # Login/register API calls
        ├── components/
        │   ├── auth/                   # Reusable auth form components
        │   ├── applicant/              # Dashboard cards, licence card, receipt
        │   ├── apply/                  # Step card, step nav, field groups
        │   ├── officer/                # Queue, overview, notification list, review steps, change password modal
        │   └── layout/                 # DashboardLayout (applicant), StepLayout
        └── pages/
            ├── auth/                   # Login, Register, StaffLogin, AdminLogin
            ├── applicant/              # Dashboard, ApplicationRouter, MyApplications, PrivacyNotice
            │   └── apply/             # Consent step + all 9 application steps
            ├── officer/               # OfficerDashboard, OfficerReviewApplication
            └── supervisor/            # SupervisorDashboard, SupervisorReviewApplication
```

---

## Backend

### Authentication

JWT tokens are issued on login and must be sent as `Authorization: Bearer <token>` on all protected routes. Three decorator guards protect routes by role:

- `@require_applicant` — applicants only
- `@require_officer` — officers only
- `@require_supervisor` — supervisors only

All roles can change their password via `POST /api/auth/change-password`.

### Registration flow

Applicants cannot sign up with just an email. They must first verify their identity by providing their TRN, date of birth, and existing licence control number — these are checked against the `licence_records` table (pre-populated from TAJ data). Only after a successful match can they set an email and password.

### OCR

When a document is uploaded, `utils/ocr.py` runs Tesseract on the image. It preprocesses the image (grayscale, denoise, adaptive threshold, upscale) then extracts fields specific to each document type:

- `national_id_front` — name, DOB, sex, nationality, place of birth, TRN, address, parish
- `national_id_back` — address, parish, TRN
- `existing_licence_front` — name, DOB, sex, licence class, expiry date, TRN, collectorate
- `existing_licence_back` — TRN, control number, first issue date, licence class

A confidence score (0.0–1.0) is returned based on how many expected fields were successfully extracted.

### Application statuses

| Status | Meaning |
|---|---|
| `DRAFT` | Created but not yet submitted |
| `SUBMITTED` | Submitted, awaiting officer assignment |
| `UNDER_REVIEW` | Assigned to an officer |
| `PENDING_ITA` | Awaiting ITA traffic clearance (replacement only) |
| `ACTION_REQUIRED` | Officer requested changes or new documents |
| `WAITING_ON_APPLICANT` | Pending applicant resubmission |
| `RESUBMITTED` | Applicant has resubmitted after action request |
| `ESCALATED` | Referred to supervisor |
| `APPROVED` | Officer/supervisor approved |
| `REJECTED` | Officer/supervisor rejected |

### Data retention (CLI)

```bash
flask purge-expired-data
```

Anonymises biometric and personal data on abandoned drafts older than 30 days and closed applications older than 7 years. Designed to be run daily via cron.

---

## Frontend

### Applicant portal

Protected by the `applicant` role. The `ApplicationContext` holds all step data in memory as the applicant progresses. Step state persists within the session but not across page refreshes (by design — the steps build on each other and a refresh returns to the start).

### Liveness verification (Step 7)

Multi-layer pipeline combining active challenge-response with passive signal analysis and deepfake detection:

**Active liveness (challenge-response)**
- 3 random gaze challenges picked from a pool of 9 (look left/right/up/down, diagonals, smile)
- Iris independence check — on a flat photo the iris and eye corner are co-planar and move together; on a real face they move independently
- Natural blink detection via Eye Aspect Ratio (EAR)

**Passive liveness signals (7 metrics, scored 0–100)**
- 3D depth score — MediaPipe Z coordinates across 468 landmarks; a flat photo has near-zero Z variance
- LBP texture entropy — Local Binary Pattern analysis of skin texture; printed/screen faces have lower entropy
- Micro-motion score — real skin has involuntary tremor even when still; a held photo has zero motion in quiet frames
- Eye specular score — specular highlights on real eyes shift constantly from micro-saccades; photos are static
- rPPG heartbeat — Cooley-Tukey FFT on the green channel extracts a 0.75–2.5 Hz heartbeat signal; estimated BPM displayed
- Iris independence variance — how much the iris moves relative to the eye socket
- Sharpest frame selection — Laplacian variance computed across sampled frames; the sharpest frame is used as the verification photo

**Deepfake detection (backend)**
- Captured frame sent to `POST /api/verify/deepface`
- DeepFace library runs anti-spoof analysis using a pretrained CNN
- Returns `is_real` and `antispoof_score`; a definite spoof fails the hard gate
- Runs as a background call — if it times out or errors, it is skipped gracefully

**Face match**
- face-api.js FaceRecognitionNet computes a 128-dimension descriptor from the live webcam frame
- Compared via Euclidean distance against the descriptor from the uploaded ID photo
- Must reach ≥ 40% similarity to pass (accommodates studio photo vs webcam variance)

### Officer portal

Dark navy blue sidebar (`#0f172a` → `#1e3a5f`). The dashboard shows queue statistics, recent applications, and a notification bell. The review screen walks through a step bar: checklist, documents, verification results, ITA correspondence, and the decision panel. Officers can change their password from the profile dropdown.

### Supervisor portal

Same blue theme as the officer portal. Supervisors see escalated cases, can manage officer accounts, upload a signature image used on approved digital licences, and have access to a broader application queue. Supervisors can change their password from the profile dropdown.

---

## Key Features

- TAJ licence record lookup for identity-gated registration
- DPA consent screen with timestamped consent recorded per application
- Multi-step application with persistent context
- Automatic OCR on uploaded identity documents with per-field confidence scoring
- 7-signal passive liveness pipeline (depth, texture, motion, eye specular, rPPG, iris independence, sharpness)
- Active challenge-response with 9-challenge pool — random gaze directions per session
- rPPG heartbeat detection via Cooley-Tukey FFT on skin green channel
- Laplacian variance sharpest-frame selection for verification photo
- DeepFace anti-spoof deepfake detection (backend, pretrained CNN)
- face-api.js 128-dim face match against uploaded ID photo — ≥ 40% similarity required
- Stripe payment integration
- Officer queue with auto-assignment
- Supervisor escalation workflow
- In-app notification system for all three roles
- Officer verification panel showing all liveness sub-scores, BPM, challenges used, and photo sharpness badge
- Digital licence generation and PDF download
- Password change for all roles
- Animated sign-out overlays and polished UI transitions

---

## Data Protection

DLRSJAM is designed in alignment with the **Data Protection Act, 2020 (Jamaica)**:

| Requirement | Implementation |
|---|---|
| Lawful basis | Public function (Road Traffic Act administration) |
| Explicit consent for biometrics | Consent screen at `/apply` — timestamped, stored per application |
| Privacy notice | Full notice at `/privacy` — linked from registration and consent screen |
| Data minimisation | Only data necessary to process the application is collected |
| Right of access | `GET /api/applicant/data-export` — full JSON export via Account Settings |
| Right of erasure | `DELETE /api/applicant/account` — anonymises all biometric and personal data |
| Retention schedule | Drafts purged after 30 days · Closed applications after 7 years |
| Automated purge | `flask purge-expired-data` CLI command — run daily via cron |
| Secure transmission | HTTPS · Bearer token auth on all protected routes |
| Biometric temp files | DeepFace temp file deleted immediately after analysis |

---

## Environment Variables

Create a `.env` file in `backend/`:

```
SECRET_KEY=your_jwt_secret
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dlrsjam
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Create a `.env` file in `frontend/`:

```
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Running the Project

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
flask db upgrade
python app.py
```

Runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `https://localhost:5173` (HTTPS required for webcam access during liveness verification).

---

## Seeding the Database

The seed scripts populate the database with realistic Jamaican test data — collectorates, staff accounts, licence records, applicants, and sample applications.

```bash
cd backend
python utils/seed_data.py
```

This runs all seed modules in order: collectorates → roles → staff → licence records → applicants → applications.

# 🌿 Eden — Medical Inventory & Prescription Management

> A React Native (Expo) SaaS app for doctors to manage medicine inventory, track prescriptions, handle medical rep payments, and print thermal receipts — built on Firebase with zero backend hosting cost.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots & Screen Map](#-screenshots--screen-map)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [Environment Variables](#-environment-variables)
- [Firebase Setup](#-firebase-setup)
- [Running the App](#-running-the-app)
- [Screen-by-Screen Breakdown](#-screen-by-screen-breakdown)
- [Data Model (Firestore)](#-data-model-firestore)
- [Security Rules](#-security-rules)
- [Services](#-services)
- [Theming](#-theming)
- [Navigation](#-navigation)
- [Multi-Tenancy (Clinics)](#-multi-tenancy-clinics)
- [Offline Support](#-offline-support)
- [Deployment](#-deployment)
- [Costs](#-costs)
- [License](#-license)

---

## 🌱 Overview

Eden is purpose-built for **Indian doctors running small-to-medium clinics**. It solves daily pain points:

| Problem | Eden's Solution |
|---------|----------------|
| Tracking 100s of medicines manually | Digital inventory with stock levels, categories, and expiry tracking |
| Writing prescriptions on paper | Digital prescription form with auto-stock decrement and thermal printing |
| Forgetting to pay medical reps on time | Payment countdown timers with push notifications at 7, 3, 1, 0 days |
| No visibility into revenue/trends | Built-in analytics dashboard with charts |
| Sharing data between husband-wife doctor teams | Multi-clinic workspace with role-based access |

The name **"Eden"** evokes a garden of healing — a place where medicine and care are organized and flourishing.

---

## ✨ Features

### 🏥 Clinic Management (Multi-Tenant)
- Create multiple clinics (workspaces)
- Invite other doctors (e.g., husband-wife duo)
- Switch between clinics seamlessly
- Role-based access: `owner`, `doctor`, `staff`

### 💊 Inventory Management
- Add medicines with category, unit, price, reorder level
- Log stock entries from medical reps (batch number, expiry, payment terms)
- Low stock alerts when medicine drops below reorder level
- Category-based organization: Tablets, Capsules, Syrups, Injections, Ointments, Drops, Surgical, Others

### 📋 Prescription System
- Search & select patients (or quick-add new ones)
- Add medicines from inventory with dosage (1-0-1, 1-1-1, etc.), timing (before/after food), duration
- Auto-calculates total amount
- **Auto-decrements stock** on save
- Full prescription history with search and date grouping
- Reprint any past prescription

### 🖨️ Thermal Printing
- Generate formatted prescription receipts
- Supports 58mm and 80mm thermal paper widths
- System print dialog (WiFi/AirPrint) via `expo-print`
- Future: Direct Bluetooth printing via dev build
- Prescription format includes: clinic header, patient info, Rx details, totals, doctor signature, footer

### 👥 Patient Management
- Patient directory with search by name or phone
- Patient profile: name, phone, age, gender, blood group, allergies, medical history
- Visit history with all prescriptions linked
- Visit count tracking

### 🤝 Medical Rep Tracking
- Rep directory with company, phone, visit schedule
- Outstanding payment tracking per rep
- **Countdown timer badges** showing days until payment due
- Color-coded urgency: green (>20 days), yellow (7–20), orange (3–7), red (<3), dark red (overdue)
- Payment logging: partial/full, cash/UPI/bank/cheque
- Payment history per rep

### 📊 Analytics Dashboard
- **Revenue trends** — Bar chart showing daily/weekly revenue
- **Top selling medicines** — Ranked by revenue with visual bars
- **Inventory overview** — Stock value, low stock count, expiring items
- **Financial overview** — Total outstanding, overdue payments
- **Patient stats** — Total, new in period, prescriptions per patient
- **Time range filter** — 7 days / 30 days / 90 days / all time

### 🔔 Push Notifications
- Payment due reminders at 7, 3, 1, 0 days before due date
- Overdue reminders at 1, 3, 7 days after
- Low stock alerts when medicine hits reorder level
- All notifications are local (no server needed, no cost)

### ⚙️ Settings
- Clinic profile management
- Prescription template customization (header & footer text)
- Dark mode toggle
- Notification preferences
- Printer configuration
- Logout

### 🎨 Design
- **Light & dark mode** with Eden green color palette
- Animated bottom tab bar with SVG bubble transitions
- Themed drawer navigation with clinic list
- Gradient headers on all screens
- Consistent card-based UI with 14px border radius throughout

---

## 🗺️ Screenshots & Screen Map

```
┌─────────────────────────────────────────────────────────────┐
│                        AUTH FLOW                             │
│                                                              │
│  Onboarding → Login → Register → ForgotPassword              │
│       ↓                                                      │
│  ClinicSelection (create / select clinic)                    │
│       ↓                                                      │
├─────────────────────────────────────────────────────────────┤
│                      MAIN APP                                │
│                                                              │
│  ┌─ Drawer ──────────────────────────────────────────┐      │
│  │  User Info, Quick Actions, Clinic List, Theme     │      │
│  └───────────────────────────────────────────────────┘      │
│                                                              │
│  ┌─ Bottom Tabs ─────────────────────────────────────┐      │
│  │  Home     │  Inventory  │  Reps      │  Profile   │      │
│  │ (Dashboard)│ (Med List) │ (Rep List) │ (Hub)      │      │
│  └───────────────────────────────────────────────────┘      │
│                                                              │
│  ┌─ Stack Screens (push from tabs) ──────────────────┐      │
│  │  AddMedicine, MedicineDetails, StockEntry          │      │
│  │  AddPatient, PatientList, PatientDetails            │      │
│  │  PrescriptionForm, PrescriptionDetail               │      │
│  │  PrescriptionHistory                                │      │
│  │  AddRep, RepDetails, PaymentTracker                 │      │
│  │  Analytics, Settings                                │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React Native (Expo) | SDK 57 |
| **Language** | TypeScript | 6.0 |
| **Backend** | Firebase (Auth + Firestore) | 11.9 |
| **Navigation** | React Navigation | 7.x |
| **Animations** | React Native Reanimated | 4.5 |
| **Icons** | Lucide React Native + Vector Icons | Latest |
| **State** | React Context + Zustand | 5.0 |
| **Dates** | date-fns | 4.1 |
| **Printing** | expo-print | 57.0 |
| **Notifications** | expo-notifications | 57.0 |
| **Storage** | AsyncStorage | 2.2 |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              React Native App               │
│                                             │
│  ┌─ Providers (Context) ─────────────────┐  │
│  │  AuthProvider (Firebase Auth)          │  │
│  │  ThemeProvider (Light/Dark + Colors)   │  │
│  │  ClinicProvider (Multi-clinic state)   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ Navigation ──────────────────────────┐  │
│  │  StackNavigator (root)                │  │
│  │  ├── Auth screens                     │  │
│  │  ├── DrawerNavigator                  │  │
│  │  │   └── TabNavigator                 │  │
│  │  │       ├── Dashboard                │  │
│  │  │       ├── Inventory                │  │
│  │  │       ├── Reps                     │  │
│  │  │       └── Profile                  │  │
│  │  └── Detail/Form screens              │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ Services ────────────────────────────┐  │
│  │  PrintService (prescription receipts) │  │
│  │  NotificationService (local alerts)   │  │
│  └───────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│         Firebase (Google Cloud)             │
│                                             │
│  ┌── Auth ───────┐  ┌── Firestore ──────┐  │
│  │ Email/Password │  │ Multi-tenant DB   │  │
│  │ Session mgmt   │  │ Offline sync      │  │
│  └────────────────┘  │ Security rules    │  │
│                      └──────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
eden-app/
├── .env.example                     # Environment variable template
├── .gitignore                       # Git ignore rules
├── app.config.js                    # Expo configuration (reads .env)
├── babel.config.js                  # Babel + Reanimated plugin
├── firestore.rules                  # Firestore security rules
├── index.ts                         # App entry point
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── SETUP.md                         # Detailed setup guide
│
└── src/
    ├── app/
    │   └── index.tsx                # Root component with all providers
    │
    ├── config/
    │   └── firebase.ts              # Firebase initialization
    │
    ├── context/
    │   ├── AuthContext.tsx           # Authentication state & actions
    │   ├── ThemeContext.tsx          # Light/dark mode + color palette
    │   └── ClinicContext.tsx         # Multi-clinic workspace state
    │
    ├── navigation/
    │   ├── StackNavigation.tsx       # Root stack with all screen routes
    │   ├── DrawerNavigator.tsx       # Side drawer with user info
    │   └── TabNavigator.tsx          # Bottom tabs with animated SVG bubbles
    │
    ├── screens/
    │   ├── InitialScreen/
    │   │   └── OnboardingScreen.tsx  # Welcome screen with Eden branding
    │   │
    │   ├── Auth/
    │   │   ├── Login.tsx             # Email/password login
    │   │   ├── Register.tsx          # Sign up (name, email, license no.)
    │   │   └── ForgotPassword.tsx    # Firebase password reset
    │   │
    │   ├── ClinicSelection/
    │   │   └── ClinicSelectionScreen.tsx  # Create/select clinic workspace
    │   │
    │   ├── Dashboard/
    │   │   └── DashboardScreen.tsx   # Overview: stats, alerts, quick actions
    │   │
    │   ├── Inventory/
    │   │   ├── InventoryListScreen.tsx     # Medicine list with search & filter
    │   │   ├── MedicineDetailsScreen.tsx   # Full medicine info & stock history
    │   │   ├── AddMedicineScreen.tsx       # Add new medicine form
    │   │   └── StockEntryScreen.tsx        # Log incoming stock from rep
    │   │
    │   ├── Patients/
    │   │   ├── PatientListScreen.tsx       # Patient directory
    │   │   ├── PatientDetailsScreen.tsx    # Patient profile & visit history
    │   │   └── AddPatientScreen.tsx        # Add new patient form
    │   │
    │   ├── Prescriptions/
    │   │   ├── PrescriptionFormScreen.tsx  # Create prescription (main workflow)
    │   │   ├── PrescriptionDetailScreen.tsx # View & reprint past prescription
    │   │   └── PrescriptionHistoryScreen.tsx # All prescriptions, grouped by date
    │   │
    │   ├── MedicalReps/
    │   │   ├── RepsScreen.tsx             # Rep list with outstanding amounts
    │   │   ├── AddRepScreen.tsx           # Add new medical rep
    │   │   ├── RepDetailsScreen.tsx       # Rep profile & purchase history
    │   │   └── PaymentTrackerScreen.tsx   # Outstanding payments with countdowns
    │   │
    │   ├── Analytics/
    │   │   └── AnalyticsScreen.tsx        # Revenue, inventory, patient charts
    │   │
    │   ├── Settings/
    │   │   └── SettingsScreen.tsx         # Clinic, theme, notifications, printer
    │   │
    │   └── Profile/
    │       └── ProfileScreen.tsx          # Profile hub with stats & navigation
    │
    ├── services/
    │   ├── PrintService.ts               # Prescription HTML → thermal print
    │   └── NotificationService.ts        # Local push notification scheduling
    │
    ├── components/
    │   ├── LoadingScreen.tsx             # Eden-branded loading spinner
    │   ├── EmptyState.tsx               # Placeholder for empty lists
    │   ├── SearchBar.tsx                # Themed search input
    │   ├── StatsCard.tsx                # Dashboard stat display card
    │   └── CountdownBadge.tsx           # Payment due countdown badge
    │
    ├── utils/
    │   ├── constants.ts                 # App-wide constants & config values
    │   └── helpers.ts                   # Utility functions (currency, dates, etc.)
    │
    └── types/
        └── index.ts                     # TypeScript types for all entities
```

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **Git** ([download](https://git-scm.com))
- **Android Studio** (for emulator) or a **physical Android device**

### Install

```bash
cd d:\apps\Eden\eden-app
npm install
```

> For the full step-by-step setup guide including Firebase project creation, see [SETUP.md](./SETUP.md).

---

## 🔐 Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

### How to Get These Values

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create one — see [Firebase Setup](#-firebase-setup))
3. Click ⚙️ **Project Settings** (gear icon in sidebar)
4. Scroll down to **"Your apps"** section
5. Click on your **Web app** (or create one: click `</>` icon)
6. Under **"SDK setup and configuration"** → select **"Config"**
7. Copy each value into your `.env` file

| `.env` Variable | Firebase Config Key | Example Value |
|----------------|--------------------|----|
| `FIREBASE_API_KEY` | `apiKey` | `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxx` |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` | `eden-app-12345.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `projectId` | `eden-app-12345` |
| `FIREBASE_STORAGE_BUCKET` | `storageBucket` | `eden-app-12345.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | `123456789012` |
| `FIREBASE_APP_ID` | `appId` | `1:123456789012:web:abc123def456` |

> ⚠️ **Never commit `.env` to git.** It's already in `.gitignore`.

### How `.env` Gets Used

```
.env  →  process.env  →  app.config.js (extra)  →  expo-constants  →  firebase.ts
```

The flow:
1. Expo reads `.env` and exposes values as `process.env.FIREBASE_*`
2. `app.config.js` maps them into `expo.extra.*`
3. `firebase.ts` reads them via `Constants.expoConfig.extra.*`
4. Firebase SDK initializes with these credentials

---

## 🔥 Firebase Setup

### 1. Create a Firebase Project

1. Visit [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Name it (e.g., `eden-medical`)
4. Disable Google Analytics (optional, not needed)
5. Click **Create Project**

### 2. Add a Web App

1. In the project dashboard, click the **`</>`** (Web) icon
2. Nickname: `Eden Web`
3. Don't enable Firebase Hosting
4. Click **Register app**
5. Copy the config values to your `.env`

### 3. Enable Authentication

1. Sidebar → **Build** → **Authentication** → **Get started**
2. Enable **Email/Password** provider
3. Save

### 4. Enable Firestore

1. Sidebar → **Build** → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Select region: `asia-south1` (for India) or closest to you
4. Click **Create**

### 5. Deploy Security Rules (Optional for Dev)

```bash
npm install -g firebase-tools
firebase login
firebase init firestore    # Select your project, use existing firestore.rules
firebase deploy --only firestore:rules
```

---

## ▶️ Running the App

| Method | Command | Use Case |
|--------|---------|----------|
| Expo Go | `npx expo start` | Quick testing (scan QR) |
| Android Emulator | `npx expo start --android` | Full testing on emulator |
| USB Device | `npx expo start --android` | Testing on real phone |
| Dev Build | `eas build --platform android --profile development` | Bluetooth printing |

### Quick Start

```bash
# 1. Make sure .env is configured
# 2. Start the dev server
npx expo start --android
```

### Clear Cache (if issues)

```bash
npx expo start --clear
```

---

## 📱 Screen-by-Screen Breakdown

### 🏠 Dashboard (`DashboardScreen.tsx`)

The home screen shows everything at a glance:

- **Greeting** with doctor's name and active clinic badge
- **Quick actions**: New Prescription, Add Medicine, Add Patient
- **Stats grid**: Total medicines, today's prescriptions, total patients, low stock alerts
- **Payment alerts**: Upcoming due payments with countdown badges
- **Outstanding summary**: Total outstanding amount across all reps
- **Recent prescriptions**: Last 5 prescriptions with quick navigation

### 📦 Inventory (`InventoryListScreen.tsx`)

- Searchable, scrollable medicine list
- Color-coded category dots (Tablets=blue, Capsules=purple, Syrups=amber, etc.)
- Stock count with low-stock warning icons
- Selling price display
- Pull-to-refresh
- FAB to add new medicine

### 📦 Add Medicine (`AddMedicineScreen.tsx`)

Form fields:
- Medicine name (required)
- Category picker (8 options)
- Unit (strip, bottle, box, etc.)
- Current stock, reorder level
- Purchase price, selling price
- Manufacturer (optional)

### 📦 Medicine Details (`MedicineDetailsScreen.tsx`)

- Full medicine info display
- Stock history (all stock entries for this medicine)
- Quick actions: Add Stock, Edit
- Stock level visualization

### 📦 Stock Entry (`StockEntryScreen.tsx`)

Log incoming stock from a medical rep:
- Select medicine
- Quantity, batch number, expiry date
- Purchase price, selling price
- Select medical rep
- Payment terms (days), auto-calculates due date
- Creates stock entry + schedules payment reminder notifications

### 👥 Patient List (`PatientListScreen.tsx`)

- Search by name or phone number
- Avatar with initial letter
- Phone number, age, gender display
- Visit count badge
- Navigation to patient details

### 👥 Patient Details (`PatientDetailsScreen.tsx`)

- Patient profile header
- Contact info, medical details (blood group, allergies)
- Visit history: all prescriptions for this patient
- Quick action: New Prescription for this patient

### 👥 Add Patient (`AddPatientScreen.tsx`)

- Name (required), phone (required)
- Optional: age, gender, blood group, allergies, medical history, notes
- Basic fields are required, detailed fields are optional (as per your spec)

### 📋 Prescription Form (`PrescriptionFormScreen.tsx`)

The main business workflow:

1. **Select patient** (search existing or add new inline)
2. **Add medicines**: search from inventory → set dosage, timing, duration, quantity
3. **Auto-calculate** amounts per item and total
4. **Diagnosis & notes** fields
5. **Preview** → **Save** (auto-decrements inventory stock)
6. **Print** → sends to thermal printer

### 📋 Prescription Detail (`PrescriptionDetailScreen.tsx`)

- Clinic header with address
- Patient info (name, age, gender, phone)
- Diagnosis
- Medicines table: #, name, dosage/timing/duration, qty, amount
- Total amount
- Notes section
- Doctor signature
- **Print** and **Reprint** buttons

### 📋 Prescription History (`PrescriptionHistoryScreen.tsx`)

- Search by patient name, medicine, or diagnosis
- Grouped by date with section headers
- Summary bar: total prescriptions, total revenue, unique patients
- Each card shows patient, medicine count, total amount
- Tap to view full prescription detail

### 🤝 Medical Reps (`RepsScreen.tsx`)

- Searchable rep list
- Outstanding amount per rep with countdown badge
- "Clear" badge for reps with no outstanding payments
- Total outstanding summary bar
- Quick access to Payment Tracker and Add Rep

### 🤝 Rep Details (`RepDetailsScreen.tsx`)

- Rep profile: name, company, phone, email, visit schedule
- Total purchases and outstanding amount
- Purchase history: all stock entries from this rep
- Payment history: all payments made to this rep

### 🤝 Payment Tracker (`PaymentTrackerScreen.tsx`)

- All unpaid/partially paid stock entries
- **Countdown timer** for each: "18 days left", "3 days left!", "OVERDUE"
- Color-coded urgency levels
- Mark as paid: full or partial amount, payment mode
- Payment history log

### 📊 Analytics (`AnalyticsScreen.tsx`)

- **Time range selector**: 7 days, 30 days, 90 days, all time
- **Revenue card**: Total revenue in selected period
- **Prescriptions card**: Count of prescriptions
- **Patients card**: Total patients
- **Medicines sold card**: Total units dispensed
- **Revenue trend chart**: Bar chart of daily revenue (last 7 data points)
- **Top selling medicines**: Ranked list with revenue bars
- **Inventory overview**: Stock value, low stock, expiring soon
- **Financial overview**: Outstanding payments, overdue count
- **Patient stats**: Total, new in period, Rx per patient ratio

### ⚙️ Settings (`SettingsScreen.tsx`)

Organized in iOS-style grouped sections:
- **Profile**: Name, email, license number
- **Clinic**: Name, address, reg number, switch clinics
- **Prescription Template**: Editable header and footer text (saved to Firestore)
- **Appearance**: Dark mode toggle
- **Notifications**: Payment reminder toggle, clear all
- **Printing**: Current printer mode info
- **Data**: Firebase cloud storage info
- **About**: Version, privacy policy
- **Account**: Logout with confirmation

### 👤 Profile (`ProfileScreen.tsx`)

A hub screen with:
- Gradient header with avatar, name, email, license, role badge
- Revenue and outstanding stats cards
- Menu navigation: Prescriptions, Patients, Analytics, Settings
- Multi-clinic list (if user belongs to multiple clinics)

---

## 🗄️ Data Model (Firestore)

```
users/{uid}
  ├── name, email, phone, licenseNo
  ├── clinicIds: [clinicId1, clinicId2]
  └── activeClinicId

clinics/{clinicId}
  ├── name, address, phone, doctorRegNo, logoUrl
  ├── ownerId, createdAt
  ├── settings: { prescriptionHeader, prescriptionFooter,
  │               defaultPaymentTermDays, lowStockThreshold }
  │
  ├── members/{uid}
  │     └── uid, name, email, role ('owner'|'doctor'|'staff'), joinedAt
  │
  ├── medicines/{medicineId}
  │     └── name, category, unit, manufacturer
  │         currentStock, reorderLevel
  │         avgPurchasePrice, sellingPrice
  │         createdAt, lastUpdated
  │
  ├── stockEntries/{entryId}
  │     └── medicineId, medicineName, quantity
  │         batchNo, expiryDate
  │         purchasePrice, sellingPrice
  │         repId, repName, companyName
  │         paymentTermDays, paymentDueDate
  │         paymentStatus ('unpaid'|'partial'|'paid')
  │         paidAmount, totalAmount, createdAt
  │
  ├── patients/{patientId}
  │     └── name, phone, age, gender, bloodGroup
  │         allergies, medicalHistory, notes
  │         visitCount, lastVisit, createdAt
  │
  ├── prescriptions/{prescriptionId}
  │     └── patientId, patientName, patientPhone
  │         patientAge, patientGender
  │         doctorId, doctorName
  │         items: [{ medicineId, medicineName, quantity,
  │                   dosage, timing, duration,
  │                   instructions, unitPrice, amount }]
  │         totalAmount, notes, diagnosis, createdAt
  │
  ├── reps/{repId}
  │     └── name, company, phone, email
  │         visitDay, notes
  │         totalPurchases, totalOutstanding, createdAt
  │
  ├── payments/{paymentId}
  │     └── repId, repName, stockEntryIds
  │         amount, mode, reference, notes
  │         date, createdAt
  │
  └── analytics/{date}
        └── revenue, prescriptionCount, patientCount
            newPatients, stockValue, medicinesSold
```

---

## 🔒 Security Rules

Firestore security rules (`firestore.rules`) enforce:

1. **User isolation**: Users can only read/write their own profile
2. **Clinic-level access**: Only clinic members can access clinic data
3. **Role-based permissions**: Only clinic owners can update clinic settings or manage members
4. **Data isolation**: All business data (medicines, patients, prescriptions, etc.) is scoped under the clinic — no cross-clinic leaks

```javascript
// Simplified version:
match /clinics/{clinicId}/{document=**} {
  allow read, write: if isClinicMember(clinicId);
}
```

---

## 🔧 Services

### PrintService (`src/services/PrintService.ts`)

Generates prescription HTML optimized for 80mm thermal printers:

```
┌─────────────────────────────────┐
│      [Clinic Name]              │
│    [Address] | [Phone]          │
│    Dr. [Name] | Reg: [No.]     │
├─────────────────────────────────┤
│ Patient: [Name]    Age: [Age]   │
│ Date: [Date]       Phone: [Ph]  │
├─────────────────────────────────┤
│ #  Medicine          Qty   Amt  │
│ 1. Paracetamol       10   ₹50  │
│    1-0-1 | After Food | 5 days │
│ 2. Amoxicillin       15   ₹120 │
│    1-1-1 | After Food | 7 days │
├─────────────────────────────────┤
│ Total:                   ₹170  │
│ [Notes]                        │
│ ─────────────────              │
│ Get well soon!                 │
│ Dr. [Name]                     │
└─────────────────────────────────┘
```

Two modes:
- `printPrescription()` — Opens system print dialog
- `generatePrescriptionPdf()` — Generates PDF file URI for sharing

### NotificationService (`src/services/NotificationService.ts`)

Schedules local push notifications (no server/FCM needed):

- **Payment reminders**: 7, 3, 1, 0 days before due + 1, 3, 7 days after (overdue)
- **Low stock alerts**: Immediate notification when stock drops below reorder level
- Android notification channels: `payments` (high), `stock` (default), `general` (default)

---

## 🎨 Theming

Two color modes with a professional medical palette:

### Light Mode
| Token | Color | Usage |
|-------|-------|-------|
| `primary` | `#1B4D3E` | Deep forest green — headers, gradients |
| `secondary` | `#2E8B6E` | Sage green — buttons, accents |
| `background` | `#F8F9FA` | Warm off-white — page background |
| `surface` | `#FFFFFF` | Cards, sheets |
| `accent` | `#D4A574` | Warm gold — secondary accent |
| `danger` | `#DC3545` | Errors, overdue payments |
| `warning` | `#F59E0B` | Low stock, approaching due dates |
| `success` | `#10B981` | Paid, in stock |

### Dark Mode
| Token | Color | Usage |
|-------|-------|-------|
| `primary` | `#0F2A1F` | Very deep green |
| `background` | `#0D1117` | GitHub-dark background |
| `surface` | `#161B22` | Card backgrounds |
| `tint` | `#3FB88C` | Emerald green accent |
| `accent` | `#C9985A` | Muted gold |

Theme is persisted in AsyncStorage and toggleable from drawer or settings.

---

## 🧭 Navigation

```
StackNavigator (root)
├── Onboarding
├── Login / Register / ForgotPassword
├── ClinicSelection
├── MainApp (DrawerNavigator)
│   └── Dashboard (TabNavigator)
│       ├── Home (DashboardScreen)
│       ├── Inventory (InventoryListScreen)
│       ├── Reps (RepsScreen)
│       └── Profile (ProfileScreen)
├── AddMedicine / MedicineDetails / StockEntry
├── PatientList / PatientDetails / AddPatient
├── PrescriptionForm / PrescriptionDetail / PrescriptionHistory
├── AddRep / RepDetails / PaymentTracker
├── Analytics
└── Settings
```

- **Bottom tabs**: Animated SVG bubble effect (same pattern as BibleApp)
- **Drawer**: User info, quick actions, clinic list, theme toggle
- **Stack**: All detail/form screens pushed on top of the tab navigator

---

## 🏢 Multi-Tenancy (Clinics)

Eden uses a **workspace model** where each clinic is an isolated workspace:

1. A doctor signs up → creates a Clinic
2. All data (medicines, patients, prescriptions) lives under `clinics/{clinicId}/`
3. The doctor can create multiple clinics and switch between them
4. Other doctors can be invited to a clinic with roles: `owner`, `doctor`, `staff`
5. Firestore security rules enforce that only members of a clinic can access its data

This makes Eden **SaaS-ready**: one Firebase project can serve multiple independent clinics.

---

## 📡 Offline Support

Firebase Firestore has **built-in offline persistence** on mobile:

- All reads are served from local cache when offline
- Writes are queued locally and synced when connectivity returns
- The app works seamlessly in areas with poor network
- No additional code needed — Firestore handles this automatically

---

## 📦 Deployment

### Play Store

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build production APK/AAB
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

### Requirements
- Google Play Developer Account ($25 one-time)
- Privacy Policy (required for medical apps)
- App screenshots and description

---

## 💰 Costs

| Service | Free Tier | Monthly Cost |
|---------|-----------|-------------|
| Firebase Auth | 50K monthly active users | $0 |
| Firestore | 1 GiB storage, 50K reads/day | $0 |
| Expo / EAS | 30 builds/month | $0 |
| Push Notifications | Local (unlimited) | $0 |
| **Total** | | **$0/month** |

The only cost is the one-time **$25 Google Play Developer fee** to publish.

For scale beyond free tier (100+ doctors), upgrade to Firebase Blaze plan (pay-as-you-go, typically a few dollars/month).

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built with 🌿 by Eden
</p>

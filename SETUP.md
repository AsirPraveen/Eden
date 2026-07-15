# 🌿 Eden — Setup & Developer Guide

A complete guide to set up, configure, and run the Eden Medical Inventory app locally.

---

## Prerequisites

Before you begin, make sure you have these installed:

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Comes with Node.js |
| **Expo CLI** | Latest | `npm install -g expo-cli` (optional, can use `npx`) |
| **Android Studio** | Latest | [developer.android.com](https://developer.android.com/studio) (for Android emulator) |
| **Git** | Any | [git-scm.com](https://git-scm.com) |

> [!TIP]
> You don't need Android Studio if you're testing on a **physical Android device** via USB or the Expo Go app (limited — won't support Bluetooth printing).

---

## Step 1: Clone & Install

```bash
# Navigate to project
cd D:\apps\Eden\eden-app

# Install dependencies
npm install
```

---

## Step 2: Set Up Firebase (Free)

### 2.1 Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Name it something like `eden-medical` or `eden-app`
4. **Disable Google Analytics** (not needed, keeps it simpler) → Click **Create Project**
5. Wait for it to finish → Click **Continue**

### 2.2 Register a Web App

> [!IMPORTANT]
> Even though Eden is a React Native app, Firebase's **Web SDK** (`firebase` npm package) is used. So you register a **Web app**, not an Android/iOS app.

1. In your Firebase project dashboard, click the **`</>`** (Web) icon to add a web app
2. Give it a nickname: `Eden Web`
3. ❌ Don't check "Firebase Hosting" — we don't need it
4. Click **Register app**
5. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB..........................",
  authDomain: "eden-medical.firebaseapp.com",
  projectId: "eden-medical",
  storageBucket: "eden-medical.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

6. **Copy these values** — you'll need them for the `.env` file

### 2.3 Enable Authentication

1. In the Firebase Console sidebar → **Build** → **Authentication**
2. Click **Get started**
3. Under **Sign-in providers**, enable **Email/Password**
4. Click **Save**

### 2.4 Enable Firestore Database

1. In the Firebase Console sidebar → **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll deploy proper rules later)
4. Select a region close to you (e.g., `asia-south1` for India)
5. Click **Create**

### 2.5 (Optional) Deploy Firestore Security Rules

The project includes production-ready security rules in [`firestore.rules`](file:///d:/apps/Eden/eden-app/firestore.rules). To deploy them:

```bash
# Install Firebase CLI (one-time)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize (select Firestore only, choose your project)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

> [!WARNING]
> If you skip this, your database will be in **test mode** which allows anyone to read/write. This is fine for local development but **must** be secured before production.

---

## Step 3: Configure Environment Variables

### 3.1 Create `.env` File

```bash
# Copy the template
cp .env.example .env
```

### 3.2 Fill in the Values

Open `.env` and paste the values from Step 2.2:

```env
# Firebase Configuration
FIREBASE_API_KEY=AIzaSyB..........................
FIREBASE_AUTH_DOMAIN=eden-medical.firebaseapp.com
FIREBASE_PROJECT_ID=eden-medical
FIREBASE_STORAGE_BUCKET=eden-medical.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

### Where Each Value Comes From

| Variable | Where to Find It |
|----------|-----------------|
| `FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Web apps → `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | Same place → `authDomain` (format: `your-project.firebaseapp.com`) |
| `FIREBASE_PROJECT_ID` | Same place → `projectId` (also shown at top of Project Settings) |
| `FIREBASE_STORAGE_BUCKET` | Same place → `storageBucket` (format: `your-project.firebasestorage.app`) |
| `FIREBASE_MESSAGING_SENDER_ID` | Same place → `messagingSenderId` (numeric) |
| `FIREBASE_APP_ID` | Same place → `appId` (format: `1:xxxxx:web:xxxxx`) |

> [!TIP]
> You can always find these values again at:
> **Firebase Console** → ⚙️ **Project Settings** (gear icon) → scroll down to **"Your apps"** → **Web app** section → **SDK setup and configuration** → select **Config**

---

## Step 4: Run the App

### Option A: Expo Go (Quick Testing — Limited)

```bash
# Start the dev server
npx expo start
```

- Scan the QR code with **Expo Go** app on your phone
- ⚠️ Bluetooth printing won't work in Expo Go

### Option B: Android Emulator

```bash
# Start with Android emulator
npx expo start --android
```

Make sure Android Studio is installed and an emulator is set up:
1. Android Studio → **Virtual Device Manager** → Create device
2. Use **Pixel 6** or similar with **API 34+**
3. Start the emulator first, then run the command above

### Option C: Physical Android Device (USB)

```bash
# Connect your phone via USB with USB Debugging enabled
npx expo start --android
```

1. On your phone: **Settings → Developer Options → USB Debugging** → Enable
2. Connect via USB cable
3. Run the command — it will install and launch

### Option D: Dev Build (Full Features — Bluetooth Printing)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build dev client for Android
eas build --platform android --profile development

# After build, install the APK on your device, then:
npx expo start --dev-client
```

---

## Project Structure

```
eden-app/
├── .env                    ← Your Firebase credentials (create from .env.example)
├── .env.example            ← Template for env vars
├── app.config.js           ← Expo config (reads .env via process.env)
├── firestore.rules         ← Firestore security rules
├── package.json            ← Dependencies & scripts
├── tsconfig.json           ← TypeScript config
├── index.ts                ← Entry point
├── src/
│   ├── app/index.tsx       ← App root with providers
│   ├── config/firebase.ts  ← Firebase initialization
│   ├── context/            ← Auth, Theme, Clinic providers
│   ├── navigation/         ← Stack, Tab, Drawer navigators
│   ├── screens/            ← All app screens (20+ screens)
│   ├── services/           ← PrintService, NotificationService
│   ├── components/         ← Reusable UI components
│   ├── utils/              ← Helpers, constants, validators
│   └── types/              ← TypeScript type definitions
```

---

## Available Scripts

| Command | What it does |
|---------|-------------|
| `npm start` | Start Expo dev server (shows QR code) |
| `npm run android` | Start on Android emulator/device |
| `npm run ios` | Start on iOS simulator (macOS only) |
| `npm run web` | Start in web browser |

---

## Firestore Data Structure

Once the app is running and you create a clinic, Firestore will have this structure:

```
users/{uid}                          ← User profile
clinics/{clinicId}                   ← Clinic document
  ├── members/{uid}                  ← Clinic members (roles)
  ├── medicines/{medicineId}         ← Medicine inventory
  ├── stockEntries/{entryId}         ← Stock purchase records
  ├── patients/{patientId}           ← Patient records
  ├── prescriptions/{prescriptionId} ← Prescription records
  ├── reps/{repId}                   ← Medical rep contacts
  ├── payments/{paymentId}           ← Payment records
  └── analytics/{date}               ← Daily aggregates
```

---

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Your `FIREBASE_API_KEY` in `.env` is wrong or empty
- Make sure you copied the **apiKey** from Firebase Console (starts with `AIza...`)
- Restart the dev server after changing `.env`

### "FirebaseError: Missing or insufficient permissions"
- Your Firestore is not in test mode, and security rules haven't been deployed
- Go to Firebase Console → Firestore → Rules → set to test mode temporarily:
  ```
  allow read, write: if true;
  ```

### "Metro bundler error" or "Unable to resolve module"
```bash
# Clear cache and restart
npx expo start --clear
```

### App crashes on startup
```bash
# Check for dependency issues
npm install

# If that doesn't help, nuke and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
# Check for type errors
npx tsc --noEmit --skipLibCheck
```

---

## Costs

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Firebase Auth** | 50K MAU | More than enough for a clinic |
| **Firestore** | 1 GiB storage, 50K reads/day | Fine for 1–5 clinics |
| **Firebase Storage** | 5 GB | For logos/images if added later |
| **Expo Go** | Free | Dev testing only |
| **EAS Build** | 30 builds/month free | For dev builds & Play Store |
| **Play Store** | $25 one-time | To publish the app |

> [!NOTE]
> **Total cost to get started: $0.** The only cost is the $25 Google Play Developer fee if/when you publish to the Play Store.

---

## Next Steps After Setup

1. **Start the app** → Register a new account → Create a clinic
2. **Add medicines** to your inventory
3. **Add a patient** and create a prescription
4. **Add medical reps** and log stock entries with payment tracking
5. **Check Analytics** from the Profile tab
6. **Customize** prescription template in Settings

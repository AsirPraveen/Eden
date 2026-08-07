# Eden

Clinic inventory & prescription app for doctors - multi-tenant SaaS on Expo + Firebase,
designed to run entirely on the Firebase free tier.

## What it does
- **Stock**: medicine master list, per-clinic quantities with batches and expiry,
  low-stock and expiring-soon views, manual adjustments with reasons.
- **Purchases & dues**: record stock bought from medical reps on credit (default 50 days),
  see "₹X due to Rep Y - 20 days left" countdowns, tap-to-call the rep, partial payments,
  local reminders 10/5/1 days before the due date.
- **Patients & prescriptions**: quick registration, stock-aware prescription builder
  (1-0-1 dosages, timing, days, auto quantity), billing with consultation fee; saving
  decrements stock atomically.
- **Printing**: Bluetooth ESC/POS thermal printers (58/80 mm) with the clinic header,
  doctor name, registration number and Rx; PDF share fallback everywhere.
- **Reports**: monthly revenue vs purchases, top medicines, stock valuation, plus a full
  append-only activity ledger (who did what, when).
- **Team**: multiple doctors and staff per practice via invite codes, role-based
  permissions enforced by Firestore security rules; multiple clinics per practice.
- Light + dark theme, offline-tolerant, English/INR.

## Handover (doctor / clinic owner)

- **[App guide - features, roles, free quotas, demo script](docs/HANDOVER_APP_GUIDE.md)** - show and explain Eden to the doctor.
- **[Doctor setup - new Google account, Firebase, Cloudinary, APK build](docs/HANDOVER_DOCTOR_SETUP.md)** - credentials and release APK under the doctor’s own accounts.

## Getting started
1. `npm install`
2. Set up Firebase and `.env.local` - see [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)
3. `npx expo start` (Expo Go - everything except Bluetooth printing)
4. For printing: `npx expo prebuild --platform android && npx expo run:android`

## Repository map
- `src/app` - screens (Expo Router): `(auth)` sign-in/up/onboarding, `(app)` tabs
  (home, stock, patients, dues, more)
- `src/services` - Firebase wiring, Firestore transactions (purchases, visits, stock),
  ESC/POS printing, notifications
- `src/stores` - session/clinic state (Zustand)
- `firestore.rules`, `firestore.indexes.json` - deploy with the Firebase CLI
- `docs/` - Firebase setup guide, Privacy Policy / Terms drafts, service agreement template

## Before going live
- Publish the privacy policy publicly and fill the placeholders in `docs/`.
- Sign the service agreement with each practice (`docs/SERVICE_AGREEMENT.md`).
- Deploy `firestore.rules` and `firestore.indexes.json`.
- Test printing on the actual thermal printer.

# Eden - Doctor Setup & APK Build (New Google Account)

**One document** for handing the project to the doctor: create accounts under **their Google ID**, plug in credentials, deploy Firebase, build the Android APK, and install on clinic phones.

**Time needed:** ~1–2 hours first time (with this guide).

**Prerequisites on a Windows PC:**

- [Node.js](https://nodejs.org/) 20+  
- [Git](https://git-scm.com/)  
- [Android Studio](https://developer.android.com/studio) (for SDK + optional emulator)  
- Doctor’s **new Gmail** (recommended: clinic-specific, e.g. `drclinic@gmail.com`)

---

## Overview

```
Doctor Gmail
    ├── Firebase project (database + login)
    ├── Cloudinary account (logos, photos, signatures)
    └── Google Play / APK install (optional later)

Your PC
    ├── Clone Eden repo
    ├── .env.local (secrets from Firebase + Cloudinary)
    ├── firebase deploy (rules)
    └── npx expo prebuild + gradlew → APK file
```

---

## Step 1 - New Google account (doctor)

1. Create a **new Google account** for the clinic (or use doctor’s personal Gmail if they prefer).
2. Sign in to that account in Chrome for all steps below.
3. **Recommendation:** Turn on 2-factor authentication and save recovery phone/email.

You (developer) can be added as **Editor** on Firebase and Cloudinary during setup, then **removed** after handover.

---

## Step 2 - Get the Eden code

```powershell
git clone https://github.com/AsirPraveen/Eden.git
cd Eden
npm install
```

Copy environment file:

```powershell
copy .env.example .env.local
```

**Never commit `.env.local`** - it stays only on the build PC.

---

## Step 3 - Firebase project (Spark / free)

### 3.1 Create project

1. Open https://console.firebase.google.com  
2. **Add project** → name e.g. `eden-clinic-prod`  
3. **Disable Google Analytics** (optional, not required for Eden)  
4. Create project

### 3.2 Register Web app

1. Project overview → **Web** (`</>`)  
2. App nickname: `eden`  
3. **Do not** enable Firebase Hosting unless you want a website  
4. Copy the `firebaseConfig` values into `.env.local`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3.3 Enable Authentication

1. **Build → Authentication → Get started**  
2. **Sign-in method → Email/Password → Enable → Save**

### 3.4 Create Firestore

1. **Build → Firestore Database → Create database**  
2. **Production mode**  
3. Region: **`asia-south1` (Mumbai)** - closest for India  
4. Enable

### 3.5 Deploy security rules & indexes (from PC)

Install Firebase CLI once:

```powershell
npm install -g firebase-tools
firebase login
```

Link project (in Eden folder):

```powershell
cd C:\path\to\Eden
firebase use --add
# Select the doctor's project, alias: default
firebase deploy --only firestore:rules,firestore:indexes
```

If Firebase asks to delete old indexes, answer **yes** for obsolete patient indexes.

**Alternative (no CLI):** paste `firestore.rules` into Console → Firestore → Rules → Publish.

### 3.6 Add developer (optional)

Firebase Console → **Project settings → Users and permissions → Add member**  
Role: **Editor** for your email. Remove after handover.

---

## Step 4 - Cloudinary (free)

Firebase Storage needs billing; Eden uses **Cloudinary** for images.

### 4.1 Create account

1. https://cloudinary.com → Sign up (free)  
2. Dashboard → note **Cloud name**

### 4.2 Upload preset (unsigned)

1. **Settings → Upload → Upload presets → Add upload preset**  
2. **Signing mode:** Unsigned  
3. **Folder:** `eden` (optional)  
4. Save → note **Preset name**

### 4.3 API keys (optional but recommended)

Settings → **API Keys** → copy **API Key** and **API Secret**  
Used only to **delete old images** when logo/photo is replaced.

### 4.4 Add to `.env.local`

```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name
EXPO_PUBLIC_CLOUDINARY_API_KEY=your_api_key
EXPO_PUBLIC_CLOUDINARY_API_SECRET=your_api_secret
```

Without Cloudinary keys: app runs; logo/signature upload disabled.

---

## Step 5 - Change Android package name (recommended)

Current package in `app.json` may be developer-specific:

```json
"package": "com.jvn.Eden"
```

**Before production handover**, change to doctor/clinic owned ID, e.g.:

```json
"package": "com.drpraveen.eden"
```

Rules:

- Lowercase, dots, no spaces  
- **Cannot change** after publishing to Play Store without creating a new app  
- After change, run **clean prebuild** (Step 7)

---

## Step 6 - Test in Expo Go (optional)

```powershell
npx expo start
```

Scan QR with Expo Go on phone.  
**Works:** login, patients, stock, PDF share.  
**Does not work in Expo Go:** Bluetooth thermal printing (needs APK).

---

## Step 7 - Build native Android project

Install any missing Expo dependency:

```powershell
npx expo install expo-build-properties
```

Generate `android/` folder:

```powershell
npx expo prebuild --platform android --clean
```

If error mentions `expo-build-properties`, run `npm install` again and retry.

---

## Step 8 - Build release APK

### 8.1 Signing (first time)

For clinic handover, a **debug-style release** or proper keystore is needed.

**Option A - Release APK (needs keystore):**

Create keystore (once):

```powershell
cd android\app
keytool -genkeypair -v -storetype PKCS12 -keystore eden-release.keystore -alias eden -keyalg RSA -keysize 2048 -validity 10000
```

Configure `android/gradle.properties` (create secrets file, **do not commit**):

```properties
EDEN_UPLOAD_STORE_FILE=eden-release.keystore
EDEN_UPLOAD_KEY_ALIAS=eden
EDEN_UPLOAD_STORE_PASSWORD=your_store_password
EDEN_UPLOAD_KEY_PASSWORD=your_key_password
```

And signing config in `android/app/build.gradle` (standard Android docs).

**Option B - Debug APK for immediate testing:**

```powershell
cd android
.\gradlew assembleDebug
```

APK: `android\app\build\outputs\apk\debug\app-debug.apk`

**Option C - Release without Play Store (common for handover):**

```powershell
cd android
.\gradlew assembleRelease
```

APK: `android\app\build\outputs\apk\release\app-release.apk`

(Release may need signing config; if build fails, use debug APK for demo or set up keystore.)

### 8.2 Install on phone

1. Copy APK to phone (USB, WhatsApp, Google Drive).  
2. Open file → Install (allow “Install unknown apps” if prompted).  
3. Open **Eden** → Sign up with doctor email → complete onboarding.

---

## Step 9 - First login in the app

1. **Sign up** with doctor email + password.  
2. **Set up my practice** → practice name, doctor name, reg no, first clinic.  
3. Or **Join** with invite code if staff.

Owner account is created automatically. Data is stored in **doctor’s Firebase project**.

---

## Step 10 - Handover checklist (developer → doctor)

| Task | Done |
|------|------|
| Firebase project owned by doctor Gmail | ☐ |
| Email/Password auth enabled | ☐ |
| Firestore in `asia-south1` | ☐ |
| Rules + indexes deployed | ☐ |
| Cloudinary account + preset | ☐ |
| `.env.local` on build PC only (not in git) | ☐ |
| APK built and installed on clinic phone(s) | ☐ |
| Doctor signature + clinic logo tested | ☐ |
| WhatsApp PDF send tested | ☐ |
| Thermal printer paired (if used) | ☐ |
| Developer removed from Firebase/Cloudinary | ☐ |
| Keystore file backed up safely (if release signing) | ☐ |

---

## Step 11 - Updating the app later

When code changes on GitHub:

```powershell
cd Eden
git pull
npm install
# Update .env.local if new keys added
npx expo prebuild --platform android --clean
cd android
.\gradlew assembleRelease
```

Distribute new APK to phones (same package name = upgrade install).

---

## Step 12 - Environment variables reference

| Variable | Required | Source |
|----------|----------|--------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase Web app config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Web app config |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase Web app config |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Web app config |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase Web app config |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase Web app config |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | For images | Cloudinary dashboard |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | For images | Cloudinary upload preset |
| `EXPO_PUBLIC_CLOUDINARY_API_KEY` | Optional | Cloudinary API keys |
| `EXPO_PUBLIC_CLOUDINARY_API_SECRET` | Optional | Cloudinary API keys |

All must be present **at build time** - they are embedded in the APK via Expo’s public env vars.

---

## Step 13 - Free tier monitoring (doctor)

### Firebase
Console → **Firestore → Usage**  
Watch daily reads/writes. Spark limits: **50K reads / 20K writes / day**.

### Cloudinary
Dashboard → **Usage**  
Free: **25 credits / 30-day rolling window**.

### When to upgrade
- Firebase: upgrade to **Blaze** (pay-as-you-go) if daily limits hit regularly.  
- Cloudinary: upgrade to Plus if many clinics upload large logos constantly.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `PluginError: expo-build-properties` | `npx expo install expo-build-properties` |
| Prebuild fails | `npx expo prebuild --clean`, delete `android` folder first |
| Login fails | Check `.env.local` matches Firebase Web app; Auth email enabled |
| Permission denied in app | Deploy `firestore.rules` again |
| Logo upload fails | Check Cloudinary preset is **Unsigned** |
| WhatsApp PDF not attaching | Use release APK (not Expo Go); WhatsApp installed |
| Bluetooth print fails | Use APK; grant Bluetooth permission; pair in More → Printer |

---

## Support contacts

| Service | Support |
|---------|---------|
| Firebase | https://firebase.google.com/support |
| Cloudinary | https://support.cloudinary.com |
| Eden code issues | Your developer / GitHub repo |

---

## Related documents

- **App features & quotas (for demo):** `docs/HANDOVER_APP_GUIDE.md`  
- **Quick Firebase reference:** `docs/FIREBASE_SETUP.md`  
- **Privacy / legal drafts:** `docs/PRIVACY_POLICY.md`, `docs/TERMS_OF_SERVICE.md`

---

*Hand this document to the doctor along with the APK file and a note that Firebase + Cloudinary passwords must stay private.*

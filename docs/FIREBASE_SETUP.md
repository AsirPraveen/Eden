# Firebase setup for Eden

Everything runs on the **free Spark plan** - no billing account needed.

## 1. Create the project
1. Go to https://console.firebase.google.com → **Add project** → name it (e.g. `eden-prod`).
2. Disable Google Analytics (not needed) → Create.

## 2. Add a Web app
1. Project overview → the `</>` (Web) icon → nickname `eden` → Register (no hosting).
2. Copy the `firebaseConfig` values into `.env.local` at the repo root:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

## 3. Enable Authentication
Build → Authentication → Get started → **Email/Password** → Enable → Save.

## 4. Create Firestore
1. Build → Firestore Database → Create database → **Production mode** → region `asia-south1` (Mumbai).
2. Deploy the rules and indexes from this repo:

```powershell
npm install -g firebase-tools
firebase login
firebase init firestore   # choose the existing project; keep firestore.rules / firestore.indexes.json
firebase deploy --only firestore:rules,firestore:indexes
```

(Or paste the contents of `firestore.rules` into the console's Rules tab manually, and let the
app's first queries prompt you with index-creation links.)

## 5. Cloudinary (image uploads - clinic logo)
Firebase Storage needs a paid plan, so Eden uses Cloudinary's free tier for images.
1. Create a free account at https://cloudinary.com → Dashboard → note the **Cloud name**.
2. Settings → Upload → **Upload presets** → Add upload preset → Signing mode: **Unsigned** → Save.
3. Add to `.env.local`:
```
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=...
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
```
(Optional - without it the app works fine, just without logo upload.)

## 6. Run the app
```powershell
npm install
npx expo start        # Expo Go: everything works except Bluetooth printing
```

## 7. Dev/production build (needed for Bluetooth printing)
```powershell
npx expo prebuild --platform android
npx expo run:android          # debug build on a connected phone
# release APK for handover:
cd android; .\gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```
Or with EAS (free tier): `npx eas build -p android --profile preview`.

## Free-tier limits to remember
- Firestore: 50K reads / 20K writes / 20K deletes per day, 1 GiB storage.
- Fine for tens of clinics. If Eden grows into a real SaaS, upgrade to Blaze (pay-as-you-go)
  - no code changes needed.

## Handover recommendation
Create the Firebase project under the **doctor's own Google account** and add yourself as an
Editor while developing. They own the data and billing from day one; remove your access at
handover.

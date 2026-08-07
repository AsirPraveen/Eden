# Eden - App Handover Guide (For Doctor / Clinic Owner)

This document explains **what Eden does**, **how to use it day-to-day**, **who can do what**, and **how much you can use on free plans** (Firebase + Cloudinary). Use it when demoing the app to the doctor or training staff.

**App name:** Eden  
**Currency:** INR (₹)  
**Platform:** Android (production APK). Expo Go works for testing but **Bluetooth printing and some native features need the installed APK**.

---

## 1. What Eden is

Eden is a **clinic management app** for a small practice (one or more clinics under one “practice” account):

| Area | What it does |
|------|----------------|
| **Stock** | Medicines per clinic, batches, expiry, low-stock alerts |
| **Purchases & dues** | Stock bought from medical reps on credit; track “₹ due to Rep X - N days left” |
| **Patients** | Register patients (shared across all clinics in the practice) |
| **Prescriptions** | Prescribe medicines, consultation fee, payment mode; **stock reduces automatically** |
| **Printing / PDF** | A4 prescription PDF, 70 mm thermal PDF, Bluetooth thermal printer |
| **WhatsApp** | Send A4 PDF directly to patient (no prefilled text message) |
| **Reports** | Monthly revenue vs purchases, top medicines, stock value |
| **Activity** | Audit trail - who changed stock or money |
| **Team** | Invite doctors and staff with roles and permissions |

---

## 2. Roles (Owner, Doctor, Staff)

| Role | Typical person | Powers |
|------|----------------|--------|
| **Owner** | Main doctor who created the practice | Everything + delete members (except self) + change staff permissions |
| **Doctor** | Another doctor in the same practice | Same as owner except cannot remove the owner |
| **Staff** | Reception / pharmacy helper | Only what the doctor enables in **Staff permissions** |

**Staff permissions** (doctor toggles in More → Staff permissions):

- Allow Purchase  
- Allow Add Medicine  
- Allow Reports  
- Allow Inventory  
- Allow Sales (prescribe / bill)  
- Allow Expenses (dues & rep payments)  
- Allow Patient Management  
- Allow Supplier Management  

Staff without a permission see a clear message asking them to contact the doctor.

---

## 3. App navigation (5 tabs)

### Home
- Clinic switcher at top (if multiple clinics).
- **Today’s summary:** collections, low stock count, dues due soon.
- **Chart:** medicines sold vs purchased (tap bars for details).
- **Staff “Collected” view:** staff only see visits they created today.
- Quick actions: New prescription, New purchase, etc. (based on permissions).

### Stock
- Medicine list for the **selected clinic** (quantities, low stock, expiring batches).
- Add medicine, open medicine detail: batches, adjust stock (with reason), edit price / generic / low-stock threshold (doctor).
- Return to rep: link adjustment to rep and batch when possible.

### Patients
- Search patients (shared across the whole practice, not per clinic).
- **New patient:** name, phone (required 10-digit Indian mobile), age, sex, address, notes.
- Patient detail: edit info, visit history (sort newest/oldest), **New prescription**.
- **Prescribe:** add medicines from stock, dosage/timing/days, consultation fee, payment mode.
- Options: print thermal, share A4 PDF, share thermal PDF, **Send to WhatsApp**, auto-WhatsApp after save.

### Dues
- Outstanding amounts to medical reps (from purchases on credit).
- Record new purchase (supplier, invoice, items, credit days, partial cash paid).
- Tap a due → record partial payment, call rep.

### More
- Profile photo, theme (System / Light / Dark).
- **Reports**, **Activity**, **Printer** (Bluetooth thermal setup).
- **Doctor signature** (doctor/owner): draw signature → appears on A4 PDF footer.
- **Clinics:** name, address, phone, doctor name on Rx, reg no, logo, theme colors.
- **Team:** invite codes for doctors/staff, assign clinics.
- **Join clinic:** enter invite code (for second clinic/practice).
- **Staff permissions**, Privacy & terms, Sign out.

---

## 4. Prescription & printing flow

1. Save prescription → stock and ledger update in one transaction.
2. **A4 PDF:** full prescription with clinic logo, doctor name (single “Dr.” prefix), patient details, signature if saved.
3. **Thermal PDF (70 mm):** receipt style; **patient phone is not printed** (privacy if receipt is thrown away).
4. **Bluetooth thermal:** ESC/POS to paired printer (58 mm or 80 mm). Setup in More → Printer.
5. **WhatsApp:** opens chat with patient number and attaches PDF named like `Joel_Prescription_01Aug2026.pdf`.

**Staff prescriptions:** PDF uses the **practice doctor’s signature** (matched by clinic doctor name, or owner’s signature).

---

## 5. Data model (simple)

One **practice** = one Firebase `account`.

Under each account:

- **Clinics** - separate locations; each has own stock, suppliers, purchases.
- **Patients** - shared by all clinics in the practice.
- **Visits** - prescriptions/bills, tied to a clinic.
- **Members** - users (owner/doctor/staff) with roles and optional clinic restrictions.
- **Invites** - 6-character codes to join the practice.

Patient phone is stored for WhatsApp and A4 Rx; not on thermal print/PDF.

---

## 6. Security

- All data is behind **email/password login** (Firebase Auth).
- **Firestore security rules** in the repo ensure:
  - Only members of a practice can read/write that practice’s data.
  - Staff with limited `clinicIds` only see those clinics’ stock/medicines/suppliers.
  - Patients are readable by all members of the practice.
- **You own the Firebase project** on the doctor’s Google account (see setup handover doc).

---

## 7. Free tier limits - Firebase (Spark plan)

No credit card required. Limits reset daily (Firestore) or monthly (Auth).

### Firebase Authentication
| Item | Free limit |
|------|------------|
| Email/password users | **50,000 monthly active users** |
| Phone OTP login | **Not on free plan** (Eden uses email only) |

For a single clinic with &lt;20 staff, this is effectively unlimited.

### Cloud Firestore (main database)
| Item | Free limit | If exceeded |
|------|------------|-------------|
| Document reads | **50,000 / day** | Reads blocked until next day (Pacific midnight reset) |
| Document writes | **20,000 / day** | Writes blocked until next day |
| Document deletes | **20,000 / day** | Deletes blocked until next day |
| Stored data | **1 GB total** | Need Blaze (paid) plan |
| Network egress | **10 GB / month** | Need Blaze plan |

**Rough usage for one busy clinic (example):**

- ~100 prescriptions/day → ~2,000–4,000 writes/day (visit + stock + ledger).
- Active app with lists and live updates → ~10,000–25,000 reads/day.
- **Comfortable on free tier** for one practice with a few clinics and staff.

**Tips to stay within limits:**

- Avoid leaving many devices logged in with Home open 24/7 (listeners consume reads).
- One practice account per doctor’s business (don’t use one Firebase project for hundreds of unrelated clinics without upgrading).

### Firebase Storage
Eden **does not use** Firebase Storage (paid on Spark). Images go to **Cloudinary**.

### Local notifications (dues, low stock, expiry)
Scheduled on the **phone** via Expo Notifications - **no Firebase quota**.

---

## 8. Free tier limits - Cloudinary (images)

Used for: clinic logos, profile photos, doctor signatures.

| Item | Free plan |
|------|-----------|
| **Credits** | **25 per month** (rolling 30-day window) |
| **1 credit** | 1 GB storage, OR 1 GB image bandwidth, OR 1,000 transformations |
| **Users** | 3 Cloudinary users |
| **Max image size** | 10 MB |

**Typical Eden usage:**

- 1 logo ~0.2 MB, 10 profile photos ~1 MB, signatures small → **well under 25 credits** for a small practice.
- Thumbnails in app use Cloudinary transforms (count toward transformation credits; still fine at this scale).

**Optional env keys** (`API_KEY` + `API_SECRET`): allow **deleting old images** when logo/photo is replaced. Without them, uploads still work; old files remain on Cloudinary.

**If Cloudinary is not configured:** app works; logo upload and signature upload show a setup message.

---

## 9. What is NOT included / limitations

| Topic | Note |
|-------|------|
| **iOS** | Codebase is Expo; iOS build possible but handover focuses on Android APK. |
| **Expo Go** | No Bluetooth printing; use dev/release APK. |
| **Offline** | Firestore has limited offline persistence; best with internet for writes. |
| **Multi-practice SaaS** | Architecture supports many accounts, but free tier is sized for small use. |
| **SMS / Phone login** | Not implemented; email/password only. |
| **Backup export** | No built-in “export all data” button; data lives in Firebase (doctor can use Firebase console). |

---

## 10. Demo script for doctor (15 minutes)

1. **Sign in** → show onboarding if new (practice name, doctor name, first clinic).
2. **More → Clinics** → logo, colors, doctor name on Rx.
3. **More → Doctor signature** → draw and save.
4. **Stock** → show medicine, batch, low stock.
5. **Dues → New purchase** → credit to rep, due date.
6. **Patients → New patient** → Indian phone validation.
7. **Prescribe** → add medicines, save, **Share A4**, **WhatsApp** (named PDF).
8. **More → Team** → generate invite for staff; show **Staff permissions**.
9. **Reports** and **Activity** briefly.
10. **More → Printer** → pair thermal printer if available.

---

## 11. Support & code

| Resource | Location |
|----------|----------|
| Source code | GitHub repo (Eden) |
| Firebase rules | `firestore.rules`, `firestore.indexes.json` |
| Env template | `.env.example` |
| Privacy / Terms drafts | `docs/PRIVACY_POLICY.md`, `docs/TERMS_OF_SERVICE.md` |
| Service agreement template | `docs/SERVICE_AGREEMENT.md` |
| **Doctor-owned setup (new Google account, APK)** | `docs/HANDOVER_DOCTOR_SETUP.md` |

---

## 12. Checklist before go-live

- [ ] Firebase project on **doctor’s Google account**
- [ ] Firestore rules and indexes deployed
- [ ] Cloudinary account + unsigned upload preset
- [ ] `.env.local` filled; release APK built with same values
- [ ] Privacy policy published (URL in app/legal if needed)
- [ ] Test prescription PDF, WhatsApp, and thermal printer on real device
- [ ] Remove developer access from Firebase/Cloudinary when handover complete

---

*Last updated for Eden v1.0.0 - Expo SDK 56, Firebase Spark, Cloudinary Free.*

/**
 * Fresh seed script - run after wiping Firestore (except `users`).
 *
 * Signs in as a real test doctor and writes data in the same order the app
 * does (account -> member -> clinics -> everything else), so every write
 * satisfies the current security rules instead of bypassing them. Seeds two
 * clinics with deliberately different medicines/suppliers/patients so the
 * per-clinic isolation is visually obvious in the app.
 *
 * Run: node scripts/seed-fresh.js
 */
const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc, collection, Timestamp } = require("firebase/firestore");

const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Error: .env.local file not found at project root!");
  process.exit(1);
}
const env = {};
fs.readFileSync(envPath, "utf8")
  .split("\n")
  .forEach((line) => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let v = m[2] || "";
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[m[1]] = v.trim();
    }
  });

const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = "dr.jane.tester2@example.com";
const PASSWORD = "password123";

const now = new Date();
const days = (n) => Timestamp.fromDate(new Date(now.getTime() + n * 86400000));
const newId = (col) => doc(collection(db, col)).id;

async function main() {
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    uid = cred.user.uid;
    console.log("Created test auth user:", uid);
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
      uid = cred.user.uid;
      console.log("Signed in as existing test user:", uid);
    } else {
      throw e;
    }
  }

  const accountId = newId("accounts");
  const clinicA = newId(`accounts/${accountId}/clinics`);
  const clinicB = newId(`accounts/${accountId}/clinics`);

  console.log("Writing account...");
  await setDoc(doc(db, "users", uid), {
    uid,
    name: "Dr. Jane Tester",
    email: EMAIL,
    accountId,
    createdAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId), {
    name: "Rao Family Practice",
    ownerUid: uid,
    plan: "free",
    createdAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "members", uid), {
    uid,
    name: "Dr. Jane Tester",
    email: EMAIL,
    role: "owner",
    clinicIds: [], // owner: access to all clinics
    active: true,
    createdAt: Timestamp.now(),
  });

  console.log("Writing clinics...");
  await setDoc(doc(db, "accounts", accountId, "clinics", clinicA), {
    name: "Rao Clinic - Anna Nagar",
    address: "12 2nd Avenue, Anna Nagar, Chennai",
    phone: "+91 98765 43210",
    doctorName: "Dr. Jane Tester",
    regNo: "TNMC-11223",
    logoUrl: null,
    printerConfig: null,
    active: true,
    createdAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "clinics", clinicB), {
    name: "Rao Clinic - T Nagar",
    address: "45 Usman Road, T Nagar, Chennai",
    phone: "+91 98765 11122",
    doctorName: "Dr. Jane Tester",
    regNo: "TNMC-11223",
    logoUrl: null,
    printerConfig: null,
    active: true,
    createdAt: Timestamp.now(),
  });

  // ---------------------------------------------------------------- Clinic A
  console.log("Seeding Clinic A (Anna Nagar)...");
  const supplierA1 = newId(`accounts/${accountId}/suppliers`);
  const supplierA2 = newId(`accounts/${accountId}/suppliers`);
  await setDoc(doc(db, "accounts", accountId, "suppliers", supplierA1), {
    clinicId: clinicA, repName: "Karthik", company: "MedPlus Distributors", phone: "+91 90000 11111", notes: "Visits every 2nd Monday", active: true, createdAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "suppliers", supplierA2), {
    clinicId: clinicA, repName: "Divya", company: "Apollo Pharma Supply", phone: "+91 90000 22222", notes: "", active: true, createdAt: Timestamp.now(),
  });

  const medA1 = newId(`accounts/${accountId}/medicines`); // Paracetamol
  const medA2 = newId(`accounts/${accountId}/medicines`); // Amoxicillin
  const medA3 = newId(`accounts/${accountId}/medicines`); // Cetirizine
  await setDoc(doc(db, "accounts", accountId, "medicines", medA1), {
    clinicId: clinicA, name: "Paracetamol 500mg", genericName: "Acetaminophen", form: "tablet", unit: "tab", defaultPrice: 2, lowStockThreshold: 50, active: true, createdAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "medicines", medA2), {
    clinicId: clinicA, name: "Amoxicillin 250mg", genericName: "Amoxicillin", form: "capsule", unit: "cap", defaultPrice: 6, lowStockThreshold: 30, active: true, createdAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "medicines", medA3), {
    clinicId: clinicA, name: "Cetirizine 10mg", genericName: "Cetirizine", form: "tablet", unit: "tab", defaultPrice: 1.5, lowStockThreshold: 40, active: true, createdAt: Timestamp.now(),
  });

  await setDoc(doc(db, "accounts", accountId, "stock", `${clinicA}_${medA1}`), {
    clinicId: clinicA, medicineId: medA1, qty: 240,
    batches: [{ batchNo: "PCM-A22", expiry: "2027-04", qty: 240, costPrice: 1.1 }],
    updatedAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "stock", `${clinicA}_${medA2}`), {
    clinicId: clinicA, medicineId: medA2, qty: 18, // below threshold of 30 -> shows as low stock
    batches: [{ batchNo: "AMX-77", expiry: "2026-11", qty: 18, costPrice: 3.4 }],
    updatedAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "stock", `${clinicA}_${medA3}`), {
    clinicId: clinicA, medicineId: medA3, qty: 150,
    batches: [{ batchNo: "CTZ-09", expiry: "2027-01", qty: 150, costPrice: 0.8 }],
    updatedAt: Timestamp.now(),
  });

  const patA1 = newId(`accounts/${accountId}/patients`);
  const patA2 = newId(`accounts/${accountId}/patients`);
  await setDoc(doc(db, "accounts", accountId, "patients", patA1), {
    name: "Ramesh Kumar", age: 45, sex: "male", phone: "9840012345", address: "Anna Nagar, Chennai", notes: "", createdAt: Timestamp.now(), lastVisitAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "patients", patA2), {
    name: "Priya S", age: 29, sex: "female", phone: "9840054321", address: "Anna Nagar, Chennai", notes: "Penicillin allergy", createdAt: Timestamp.now(), lastVisitAt: null,
  });

  const purchaseA1 = newId(`accounts/${accountId}/purchases`);
  await setDoc(doc(db, "accounts", accountId, "purchases", purchaseA1), {
    clinicId: clinicA, supplierId: supplierA1, supplierName: "MedPlus Distributors", invoiceNo: "INV-4417",
    items: [{ medicineId: medA1, medicineName: "Paracetamol 500mg", batchNo: "PCM-A22", expiry: "2027-04", qty: 200, costPrice: 1.1, freeQty: 20 }],
    totalAmount: 220, creditDays: 50, date: days(-8), dueDate: days(42),
    paidAmount: 0, payments: [], status: "unpaid", createdBy: uid, createdAt: days(-8),
  });
  const purchaseA2 = newId(`accounts/${accountId}/purchases`);
  await setDoc(doc(db, "accounts", accountId, "purchases", purchaseA2), {
    clinicId: clinicA, supplierId: supplierA2, supplierName: "Apollo Pharma Supply", invoiceNo: "INV-9981",
    items: [{ medicineId: medA2, medicineName: "Amoxicillin 250mg", batchNo: "AMX-77", expiry: "2026-11", qty: 40, costPrice: 3.4, freeQty: 0 }],
    totalAmount: 136, creditDays: 50, date: days(-45), dueDate: days(5),
    paidAmount: 0, payments: [], status: "unpaid", createdBy: uid, createdAt: days(-45),
  });

  const visitA1 = newId(`accounts/${accountId}/visits`);
  await setDoc(doc(db, "accounts", accountId, "visits", visitA1), {
    clinicId: clinicA, patientId: patA1, patientName: "Ramesh Kumar", date: Timestamp.now(), diagnosis: "Viral fever",
    items: [{ medicineId: medA1, medicineName: "Paracetamol 500mg", qty: 10, dosage: "1-0-1", timing: "after food", days: 5, price: 2 }],
    consultationFee: 200, medicinesAmount: 20, totalAmount: 220, paymentMode: "cash", printedAt: null, createdBy: uid,
  });

  await setDoc(doc(db, "accounts", accountId, "ledger", newId(`accounts/${accountId}/ledger`)), {
    type: "purchase", refId: purchaseA1, clinicId: clinicA, summary: "Purchase from MedPlus Distributors (1 item)",
    medicineDeltas: [{ medicineId: medA1, medicineName: "Paracetamol 500mg", delta: 220 }], amount: -220, byUid: uid, at: days(-8),
  });
  await setDoc(doc(db, "accounts", accountId, "ledger", newId(`accounts/${accountId}/ledger`)), {
    type: "sale", refId: visitA1, clinicId: clinicA, summary: "Prescription for Ramesh Kumar",
    medicineDeltas: [{ medicineId: medA1, medicineName: "Paracetamol 500mg", delta: -10 }], amount: 220, byUid: uid, at: Timestamp.now(),
  });

  // ---------------------------------------------------------------- Clinic B
  console.log("Seeding Clinic B (T Nagar)...");
  const supplierB1 = newId(`accounts/${accountId}/suppliers`);
  await setDoc(doc(db, "accounts", accountId, "suppliers", supplierB1), {
    clinicId: clinicB, repName: "Vignesh", company: "Sun Pharma Regional", phone: "+91 90000 33333", notes: "", active: true, createdAt: Timestamp.now(),
  });

  const medB1 = newId(`accounts/${accountId}/medicines`); // Azithromycin
  const medB2 = newId(`accounts/${accountId}/medicines`); // Pantoprazole
  const medB3 = newId(`accounts/${accountId}/medicines`); // ORS
  await setDoc(doc(db, "accounts", accountId, "medicines", medB1), {
    clinicId: clinicB, name: "Azithromycin 500mg", genericName: "Azithromycin", form: "tablet", unit: "tab", defaultPrice: 12, lowStockThreshold: 20, active: true, createdAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "medicines", medB2), {
    clinicId: clinicB, name: "Pantoprazole 40mg", genericName: "Pantoprazole", form: "tablet", unit: "tab", defaultPrice: 3.5, lowStockThreshold: 30, active: true, createdAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "medicines", medB3), {
    clinicId: clinicB, name: "ORS Sachet", genericName: "Oral Rehydration Salts", form: "powder", unit: "sachet", defaultPrice: 8, lowStockThreshold: 15, active: true, createdAt: Timestamp.now(),
  });

  await setDoc(doc(db, "accounts", accountId, "stock", `${clinicB}_${medB1}`), {
    clinicId: clinicB, medicineId: medB1, qty: 60,
    batches: [{ batchNo: "AZM-14", expiry: "2027-02", qty: 60, costPrice: 8.5 }],
    updatedAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "stock", `${clinicB}_${medB2}`), {
    clinicId: clinicB, medicineId: medB2, qty: 8, // low
    batches: [{ batchNo: "PAN-33", expiry: "2026-09", qty: 8, costPrice: 2.1 }],
    updatedAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "stock", `${clinicB}_${medB3}`), {
    clinicId: clinicB, medicineId: medB3, qty: 90,
    batches: [{ batchNo: "ORS-02", expiry: "2027-06", qty: 90, costPrice: 4 }],
    updatedAt: Timestamp.now(),
  });

  const patB1 = newId(`accounts/${accountId}/patients`);
  const patB2 = newId(`accounts/${accountId}/patients`);
  await setDoc(doc(db, "accounts", accountId, "patients", patB1), {
    name: "Suresh Babu", age: 52, sex: "male", phone: "9841077889", address: "T Nagar, Chennai", notes: "Diabetic", createdAt: Timestamp.now(), lastVisitAt: Timestamp.now(),
  });
  await setDoc(doc(db, "accounts", accountId, "patients", patB2), {
    name: "Lakshmi N", age: 34, sex: "female", phone: "9841033221", address: "T Nagar, Chennai", notes: "", createdAt: Timestamp.now(), lastVisitAt: null,
  });

  const purchaseB1 = newId(`accounts/${accountId}/purchases`);
  await setDoc(doc(db, "accounts", accountId, "purchases", purchaseB1), {
    clinicId: clinicB, supplierId: supplierB1, supplierName: "Sun Pharma Regional", invoiceNo: "INV-2201",
    items: [{ medicineId: medB1, medicineName: "Azithromycin 500mg", batchNo: "AZM-14", expiry: "2027-02", qty: 60, costPrice: 8.5, freeQty: 0 }],
    totalAmount: 510, creditDays: 50, date: days(-40), dueDate: days(10),
    paidAmount: 250, payments: [{ amount: 250, date: days(-10), mode: "upi", note: "Part payment", byUid: uid }],
    status: "partial", createdBy: uid, createdAt: days(-40),
  });

  const visitB1 = newId(`accounts/${accountId}/visits`);
  await setDoc(doc(db, "accounts", accountId, "visits", visitB1), {
    clinicId: clinicB, patientId: patB1, patientName: "Suresh Babu", date: Timestamp.now(), diagnosis: "Acid reflux",
    items: [{ medicineId: medB2, medicineName: "Pantoprazole 40mg", qty: 14, dosage: "1-0-0", timing: "before food", days: 14, price: 3.5 }],
    consultationFee: 250, medicinesAmount: 49, totalAmount: 299, paymentMode: "upi", printedAt: null, createdBy: uid,
  });

  await setDoc(doc(db, "accounts", accountId, "ledger", newId(`accounts/${accountId}/ledger`)), {
    type: "purchase", refId: purchaseB1, clinicId: clinicB, summary: "Purchase from Sun Pharma Regional (1 item)",
    medicineDeltas: [{ medicineId: medB1, medicineName: "Azithromycin 500mg", delta: 60 }], amount: -510, byUid: uid, at: days(-40),
  });
  await setDoc(doc(db, "accounts", accountId, "ledger", newId(`accounts/${accountId}/ledger`)), {
    type: "payment", refId: purchaseB1, clinicId: clinicB, summary: "Payment to Sun Pharma Regional",
    medicineDeltas: [], amount: -250, byUid: uid, at: days(-10),
  });
  await setDoc(doc(db, "accounts", accountId, "ledger", newId(`accounts/${accountId}/ledger`)), {
    type: "sale", refId: visitB1, clinicId: clinicB, summary: "Prescription for Suresh Babu",
    medicineDeltas: [{ medicineId: medB2, medicineName: "Pantoprazole 40mg", delta: -14 }], amount: 299, byUid: uid, at: Timestamp.now(),
  });

  console.log("\nDone. Sign in with:");
  console.log("  Email:   ", EMAIL);
  console.log("  Password:", PASSWORD);
  console.log("Account:", accountId, "| Clinic A:", clinicA, "| Clinic B:", clinicB);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

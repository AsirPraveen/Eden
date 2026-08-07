const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  runTransaction,
  Timestamp
} = require("firebase/firestore");

// 1. Read .env.local to load Firebase Config
const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Error: .env.local file not found at project root!");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error("Error: EXPO_PUBLIC_FIREBASE_API_KEY is not defined in .env.local!");
  process.exit(1);
}

console.log("Connecting to Firebase project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data structure helpers mimicking src/services/paths.ts
const accountId = "test-account-123";
const clinicId = "test-clinic-abc";
const docUid = "test-doctor-uid-999";
const patId = "test-patient-xyz";
const medId = "med-paracetamol-500";

// Helper functions for FEFO (first-expiry-first-out)
function deductFromBatches(batches, qty) {
  const sorted = [...batches].sort((a, b) => (a.expiry || "9999-99").localeCompare(b.expiry || "9999-99"));
  let remaining = qty;
  const result = [];
  for (const b of sorted) {
    if (remaining <= 0) {
      result.push(b);
      continue;
    }
    const take = Math.min(b.qty, remaining);
    remaining -= take;
    if (b.qty - take > 0) {
      result.push({ ...b, qty: b.qty - take });
    }
  }
  return result;
}

async function runTests() {
  console.log("\n=== Starting Seed & Integration Test ===");

  // 1. Seed Clinic, User, Member, Medicine & Initial Stock
  console.log("Seeding Account & Clinic...");
  await setDoc(doc(db, "accounts", accountId), {
    id: accountId,
    name: "Eden Test Diagnostics & Clinic",
    ownerUid: docUid,
    plan: "free",
    createdAt: Timestamp.now(),
  });

  await setDoc(doc(db, "users", docUid), {
    uid: docUid,
    name: "Dr. Jane Tester",
    email: "dr.jane.tester@example.com",
    accountId: accountId,
    createdAt: Timestamp.now(),
  });

  await setDoc(doc(db, "accounts", accountId, "members", docUid), {
    uid: docUid,
    name: "Dr. Jane Tester",
    email: "dr.jane.tester@example.com",
    role: "owner",
    clinicIds: [], // all clinics
    active: true,
    createdAt: Timestamp.now(),
  });

  await setDoc(doc(db, "accounts", accountId, "clinics", clinicId), {
    id: clinicId,
    name: "Primary Care Downtown",
    address: "456 Oak Street, Cityville",
    phone: "555-0199",
    doctorName: "Dr. Jane Tester",
    regNo: "MC-123456",
    logoUrl: null,
    printerConfig: null,
    active: true,
    createdAt: Timestamp.now(),
  });

  console.log("Seeding Patient...");
  await setDoc(doc(db, "accounts", accountId, "patients", patId), {
    id: patId,
    name: "John Doe",
    age: 35,
    sex: "male",
    phone: "9876543210",
    address: "123 Elm St, Town",
    notes: "Patient has history of mild allergies",
    createdAt: Timestamp.now(),
    lastVisitAt: null,
  });

  console.log("Seeding Medicine...");
  await setDoc(doc(db, "accounts", accountId, "medicines", medId), {
    id: medId,
    name: "Paracetamol 500mg",
    genericName: "Acetaminophen",
    form: "tablet",
    unit: "tab",
    defaultPrice: 3.5, // 3.5 per tablet
    lowStockThreshold: 15,
    active: true,
    createdAt: Timestamp.now(),
  });

  console.log("Seeding Stock with 2 Batches (FEFO test)...");
  // Batch A: Expiring 2026-08 (60 qty) -> Should be consumed first
  // Batch B: Expiring 2026-12 (40 qty) -> Should be consumed second
  const initialStock = {
    clinicId,
    medicineId: medId,
    qty: 100,
    batches: [
      { batchNo: "BATCH-B", expiry: "2026-12", qty: 40, costPrice: 1.5 },
      { batchNo: "BATCH-A", expiry: "2026-08", qty: 60, costPrice: 1.2 },
    ],
    updatedAt: Timestamp.now(),
  };
  await setDoc(doc(db, "accounts", accountId, "stock", `${clinicId}_${medId}`), initialStock);

  console.log("Initial seed successful!");

  // 2. Perform checkout (Visit/Prescription)
  console.log("\nSimulating visit/prescription checkout of 50 tablets of Paracetamol...");
  const visitRef = doc(collection(db, "accounts", accountId, "visits"));
  const stockRef = doc(db, "accounts", accountId, "stock", `${clinicId}_${medId}`);
  const patientRef = doc(db, "accounts", accountId, "patients", patId);
  const ledgerRef = doc(collection(db, "accounts", accountId, "ledger"));

  const qtyToDeduct = 50;
  const unitPrice = 3.5;
  const consultationFee = 150;
  const medicinesAmount = qtyToDeduct * unitPrice;
  const totalAmount = medicinesAmount + consultationFee;

  await runTransaction(db, async (tx) => {
    // Read stock
    const stockSnap = await tx.get(stockRef);
    if (!stockSnap.exists()) {
      throw new Error("Stock document does not exist!");
    }
    const currentStock = stockSnap.data();
    if (currentStock.qty < qtyToDeduct) {
      throw new Error(`Insufficient stock: current = ${currentStock.qty}`);
    }

    // Deduct batches using FEFO
    const newBatches = deductFromBatches(currentStock.batches, qtyToDeduct);
    const newQty = currentStock.qty - qtyToDeduct;

    // Write Visit Doc
    tx.set(visitRef, {
      clinicId,
      patientId: patId,
      patientName: "John Doe",
      date: Timestamp.now(),
      diagnosis: "Common Cold & Fever",
      items: [
        {
          medicineId: medId,
          medicineName: "Paracetamol 500mg",
          qty: qtyToDeduct,
          dosage: "1-0-1",
          timing: "after food",
          days: 5,
          price: unitPrice,
        }
      ],
      consultationFee,
      medicinesAmount,
      totalAmount,
      paymentMode: "cash",
      printedAt: null,
      createdBy: docUid,
    });

    // Update Stock Doc
    tx.update(stockRef, {
      qty: newQty,
      batches: newBatches,
      updatedAt: Timestamp.now(),
    });

    // Update Patient's lastVisitAt
    tx.update(patientRef, {
      lastVisitAt: Timestamp.now(),
    });

    // Write Ledger Entry
    tx.set(ledgerRef, {
      type: "sale",
      refId: visitRef.id,
      clinicId,
      summary: `Prescription for John Doe`,
      medicineDeltas: [
        { medicineId: medId, medicineName: "Paracetamol 500mg", delta: -qtyToDeduct }
      ],
      amount: totalAmount,
      byUid: docUid,
      at: Timestamp.now(),
    });
  });

  console.log("Checkout transaction completed successfully!");

  // 3. Verify all updates
  console.log("\n=== Verifying Results in Firestore ===");

  // Verify stock levels and FEFO batch consumption
  const stockSnap = await getDoc(stockRef);
  const updatedStock = stockSnap.data();
  console.log("Updated Stock Qty:", updatedStock.qty, "(Expected: 50)");
  console.log("Updated Batches:", JSON.stringify(updatedStock.batches));

  // BATCH-A had 60 qty expiring 2026-08 (earliest). Deducting 50 should leave 10 qty in BATCH-A.
  // BATCH-B had 40 qty expiring 2026-12. Deducting 50 should leave BATCH-B untouched at 40.
  const batchA = updatedStock.batches.find(b => b.batchNo === "BATCH-A");
  const batchB = updatedStock.batches.find(b => b.batchNo === "BATCH-B");

  let testPassed = true;

  if (updatedStock.qty !== 50) {
    console.error("❌ FAIL: Stock Qty is not 50");
    testPassed = false;
  }
  if (!batchA || batchA.qty !== 10) {
    console.error("❌ FAIL: BATCH-A qty is not 10 (got " + (batchA ? batchA.qty : "undefined") + ")");
    testPassed = false;
  }
  if (!batchB || batchB.qty !== 40) {
    console.error("❌ FAIL: BATCH-B qty is not 40 (got " + (batchB ? batchB.qty : "undefined") + ")");
    testPassed = false;
  }

  // Verify Patient's lastVisitAt
  const patientSnap = await getDoc(patientRef);
  const updatedPatient = patientSnap.data();
  if (!updatedPatient.lastVisitAt) {
    console.error("❌ FAIL: Patient lastVisitAt was not updated");
    testPassed = false;
  } else {
    console.log("Patient lastVisitAt updated:", updatedPatient.lastVisitAt.toDate().toISOString());
  }

  if (testPassed) {
    console.log("\n🎉 ALL TESTS PASSED! FEFO batch deduction, patient visit logging, and stock transaction updates worked correctly.");
  } else {
    console.error("\n❌ TESTS FAILED. Check console logs for details.");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});

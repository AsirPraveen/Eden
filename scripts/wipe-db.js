/**
 * Wipe DB Script
 * Deletes all documents in top-level collections and their subcollections.
 *
 * Run: node scripts/wipe-db.js
 */
const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc } = require("firebase/firestore");

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
const db = getFirestore(app);

const SUBCOLLECTIONS = [
  "members",
  "clinics",
  "suppliers",
  "medicines",
  "stock",
  "purchases",
  "patients",
  "visits",
  "ledger",
];

async function deleteCollection(pathStr) {
  const colRef = collection(db, pathStr);
  const snap = await getDocs(colRef);
  console.log(`Deleting ${snap.size} docs from ${pathStr}...`);
  const promises = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(promises);
  return snap.docs;
}

async function main() {
  console.log("Starting Firestore database wipe...");

  // 1. Wipe invites
  await deleteCollection("invites");

  // 2. Wipe accounts and their subcollections
  const accountsColRef = collection(db, "accounts");
  const accountsSnap = await getDocs(accountsColRef);
  
  for (const accountDoc of accountsSnap.docs) {
    const accountId = accountDoc.id;
    console.log(`Cleaning account: ${accountId}`);

    // Delete all subcollections of this account
    for (const subName of SUBCOLLECTIONS) {
      await deleteCollection(`accounts/${accountId}/${subName}`);
    }

    // Delete the account doc itself
    await deleteDoc(accountDoc.ref);
    console.log(`Deleted account document: ${accountId}`);
  }

  // 3. Wipe users
  await deleteCollection("users");

  console.log("Wipe completed successfully! Firestore is now empty.");
}

main().catch((err) => {
  console.error("Error wiping database:", err);
  process.exit(1);
});

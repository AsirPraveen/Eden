const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc, updateDoc, deleteDoc, getDoc } = require("firebase/firestore");

// Read .env.local to load Firebase Config
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
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = "dr.jane.tester@example.com";
const password = "password123";
const legacyUid = "test-doctor-uid-999";
const accountId = "test-account-123";

async function run() {
  console.log(`Creating Firebase Auth user for ${email}...`);
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log("Auth user created successfully! New UID:", uid);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log("Auth user already exists in Firebase Auth. We will attempt to link it.");
      // We can't fetch the UID of an existing user using Client SDK without logging in.
      // But we can ask the user to delete it or we can let them know.
      console.error("Please delete the user from Firebase Console -> Authentication first, or sign up in the app, then let me know.");
      process.exit(1);
    } else {
      console.error("Failed to create user:", err);
      process.exit(1);
    }
  }

  console.log("Linking pre-seeded Firestore docs to new UID...");
  
  // 1. Get legacy user doc
  const userDocRef = doc(db, "users", legacyUid);
  const userSnap = await getDoc(userDocRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    // Save to new UID doc
    await setDoc(doc(db, "users", uid), {
      ...userData,
      uid: uid,
      accountId: accountId
    });
    // Delete legacy doc
    await deleteDoc(userDocRef);
  } else {
    // If not seeded yet, create it
    await setDoc(doc(db, "users", uid), {
      uid: uid,
      name: "Dr. Jane Tester",
      email: email,
      accountId: accountId,
      createdAt: new Date(),
    });
  }

  // 2. Member doc
  const memberDocRef = doc(db, "accounts", accountId, "members", legacyUid);
  const memberSnap = await getDoc(memberDocRef);
  if (memberSnap.exists()) {
    const memberData = memberSnap.data();
    await setDoc(doc(db, "accounts", accountId, "members", uid), {
      ...memberData,
      uid: uid,
    });
    await deleteDoc(memberDocRef);
  }

  // 3. Update account ownerUid
  await updateDoc(doc(db, "accounts", accountId), {
    ownerUid: uid
  });

  console.log(`\n🎉 Success! You can now log in using:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

run().catch(console.error);

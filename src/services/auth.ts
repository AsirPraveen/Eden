import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  collection,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { accountDoc, inviteDoc, memberDoc, userDoc } from "./paths";
import { DEFAULT_STAFF_PERMISSIONS } from "./permissions";
import { Invite, Member, UserDoc } from "../types/models";

export async function signUp(name: string, email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim() });
  await setDoc(userDoc(cred.user.uid), {
    uid: cred.user.uid,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    accountId: null,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function signOut() {
  return fbSignOut(auth);
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function fetchUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/** Create a new account (practice) with its first clinic; caller becomes owner. */
export async function createAccount(params: {
  user: User;
  accountName: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  doctorName: string;
  regNo: string;
}): Promise<string> {
  const { user } = params;
  const accountRef = doc(collection(db, "accounts"));
  const clinicRef = doc(collection(db, "accounts", accountRef.id, "clinics"));

  await runTransaction(db, async (tx) => {
    tx.set(accountRef, {
      name: params.accountName.trim(),
      ownerUid: user.uid,
      plan: "free",
      staffPermissions: DEFAULT_STAFF_PERMISSIONS,
      createdAt: serverTimestamp(),
    });
    tx.set(memberDoc(accountRef.id, user.uid), {
      uid: user.uid,
      name: user.displayName ?? "",
      email: user.email ?? "",
      role: "owner",
      clinicIds: [],
      active: true,
      createdAt: serverTimestamp(),
    } satisfies Omit<Member, "createdAt"> & { createdAt: unknown });
    tx.set(clinicRef, {
      name: params.clinicName.trim(),
      address: params.clinicAddress.trim(),
      phone: params.clinicPhone.trim(),
      doctorName: params.doctorName.trim(),
      regNo: params.regNo.trim(),
      logoUrl: null,
      primaryColor: null,
      accentColor: null,
      printerConfig: null,
      active: true,
      createdAt: serverTimestamp(),
    });
    tx.update(userDoc(user.uid), { accountId: accountRef.id });
  });
  return accountRef.id;
}

/** Join an existing account using an invite code. */
export async function joinWithInvite(user: User, code: string): Promise<string> {
  const trimmed = code.trim().toUpperCase();
  return runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteDoc(trimmed));
    if (!inviteSnap.exists()) throw new Error("Invite code not found.");
    const invite = inviteSnap.data() as Invite;
    if (invite.usedBy) throw new Error("This invite code has already been used.");
    if (invite.expiresAt instanceof Timestamp && invite.expiresAt.toDate() < new Date())
      throw new Error("This invite code has expired.");

    tx.set(memberDoc(invite.accountId, user.uid), {
      uid: user.uid,
      name: user.displayName ?? "",
      email: user.email ?? "",
      role: invite.role,
      clinicIds: invite.clinicIds ?? [],
      active: true,
      createdAt: serverTimestamp(),
    });
    tx.update(userDoc(user.uid), { accountId: invite.accountId });
    tx.update(inviteDoc(trimmed), { usedBy: user.uid });
    return invite.accountId;
  });
}

export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address is not valid.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return (e as Error)?.message ?? "Something went wrong.";
  }
}

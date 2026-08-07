import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { create } from "zustand";
import { auth } from "../services/firebase";
import { clinicsCol, memberDoc, userDoc } from "../services/paths";
import { Clinic, Member } from "../types/models";

type SessionState = {
  initialized: boolean;
  user: User | null;
  accountId: string | null;
  member: Member | null;
  clinics: Clinic[];
  clinicId: string | null;
  setClinicId: (id: string) => void;
  /** Re-check the user doc after onboarding creates/joins an account. */
  refreshAccount: () => Promise<string | null>;
};

const CLINIC_KEY = "eden.selectedClinic";

let unsubClinics: (() => void) | null = null;
let unsubMember: (() => void) | null = null;
let activeUid: string | null = null;
let syncPromise: Promise<string | null> | null = null;

export const useSession = create<SessionState>((set, get) => ({
  initialized: false,
  user: null,
  accountId: null,
  member: null,
  clinics: [],
  clinicId: null,

  setClinicId: (id: string) => {
    set({ clinicId: id });
    AsyncStorage.setItem(CLINIC_KEY, id).catch(() => { });
  },

  refreshAccount: () => {
    const user = get().user;
    if (!user) return Promise.resolve(null);
    return syncSessionForUser(user);
  },
}));

function detach() {
  unsubClinics?.();
  unsubMember?.();
  unsubClinics = null;
  unsubMember = null;
}

function attachAccountListeners(
  user: User,
  accountId: string | null,
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState
) {
  detach();
  set({ accountId, member: null, clinics: [], clinicId: accountId ? get().clinicId : null });
  if (!accountId) return;

  unsubMember = onSnapshot(
    memberDoc(accountId, user.uid),
    (snap) => {
      const member = snap.exists() ? (snap.data() as Member) : null;
      set({ member });

      if (!snap.exists()) {
        updateDoc(userDoc(user.uid), { accountId: null }).catch(() => { });
        unsubClinics?.();
        unsubClinics = null;
        set({ accountId: null, member: null, clinics: [], clinicId: null });
        AsyncStorage.removeItem(CLINIC_KEY).catch(() => { });
        return;
      }

      if (member && member.active) {
        if (!unsubClinics) {
          unsubClinics = onSnapshot(
            query(clinicsCol(accountId), where("active", "==", true)),
            (clinicsSnap) => {
              const clinics = clinicsSnap.docs
                .map((d) => ({ id: d.id, ...d.data() } as Clinic))
                .sort((a, b) => a.name.localeCompare(b.name));
              const allowed =
                member.clinicIds.length > 0
                  ? clinics.filter((c) => member.clinicIds.includes(c.id))
                  : clinics;
              const current = get().clinicId;
              let clinicId = current && allowed.some((c) => c.id === current) ? current : null;
              if (!clinicId && allowed.length > 0) clinicId = allowed[0].id;
              set({ clinics: allowed, clinicId });
              if (clinicId) AsyncStorage.setItem(CLINIC_KEY, clinicId).catch(() => { });
            },
            (err) => {
              console.error("Error in clinics snapshot listener:", err);
            }
          );
        }
      } else {
        unsubClinics?.();
        unsubClinics = null;
        set({ clinics: [], clinicId: null });
      }
    },
    (err) => {
      console.error("Error in member snapshot listener:", err);
    }
  );
}

function clearSession() {
  activeUid = null;
  syncPromise = null;
  detach();
  useSession.setState({
    initialized: true,
    user: null,
    accountId: null,
    member: null,
    clinics: [],
    clinicId: null,
  });
}

/**
 * Load user + accountId into the store. Safe to call after sign-in/sign-up and
 * from onAuthStateChanged - concurrent calls for the same user are deduped.
 */
export function syncSessionForUser(user: User): Promise<string | null> {
  if (syncPromise && activeUid === user.uid) return syncPromise;

  activeUid = user.uid;
  syncPromise = (async () => {
    const set = useSession.setState;
    const get = useSession.getState;

    const stored = await AsyncStorage.getItem(CLINIC_KEY).catch(() => null);
    if (stored) set({ clinicId: stored });
    set({ user });

    try {
      const snap = await getDoc(userDoc(user.uid));
      const accountId = snap.exists() ? ((snap.data().accountId as string | null) ?? null) : null;
      attachAccountListeners(user, accountId, set, get);
      set({ initialized: true });
      return accountId;
    } catch (err) {
      console.error("Failed to hydrate session:", err);
      set({ initialized: true });
      throw err;
    } finally {
      if (activeUid === user.uid) syncPromise = null;
    }
  })();

  return syncPromise;
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    clearSession();
    return;
  }
  syncSessionForUser(user).catch(() => { });
});

/** Convenience selectors */
export const useAccountId = () => useSession((s) => s.accountId);
export const useClinicId = () => useSession((s) => s.clinicId);
export const useRole = () => useSession((s) => s.member?.role ?? null);
export const useCanManage = () =>
  useSession((s) => s.member?.role === "owner" || s.member?.role === "doctor");

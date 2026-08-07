import { getDoc, getDocs } from "firebase/firestore";
import { Clinic, Member } from "../types/models";
import { namesMatchDoctor } from "../utils/doctor";
import { accountDoc, memberDoc, membersCol } from "./paths";

function isPrescriber(m: Member): boolean {
  return m.role === "owner" || m.role === "doctor";
}

/** Cloudinary URL for the doctor signature that should appear on prescriptions. */
export async function resolveDoctorSignatureUrl(
  accountId: string,
  clinic: Clinic,
  currentMember: Member | null
): Promise<string | null> {
  if (!currentMember) return null;

  if (isPrescriber(currentMember) && currentMember.signatureUrl) {
    return currentMember.signatureUrl;
  }

  const snap = await getDocs(membersCol(accountId));
  const members = snap.docs.map((d) => d.data() as Member);
  const signers = members.filter((m) => m.active && isPrescriber(m) && m.signatureUrl);

  if (clinic.doctorName) {
    const byName = signers.find((m) => namesMatchDoctor(m.name, clinic.doctorName));
    if (byName?.signatureUrl) return byName.signatureUrl;
  }

  const accountSnap = await getDoc(accountDoc(accountId));
  const ownerUid = accountSnap.exists() ? (accountSnap.data().ownerUid as string) : null;
  if (ownerUid) {
    const owner = signers.find((m) => m.uid === ownerUid);
    if (owner?.signatureUrl) return owner.signatureUrl;
  }

  return signers[0]?.signatureUrl ?? null;
}

/** Load a member doc (e.g. prescription doctor for staff). */
export async function getMember(accountId: string, uid: string): Promise<Member | null> {
  const snap = await getDoc(memberDoc(accountId, uid));
  return snap.exists() ? (snap.data() as Member) : null;
}

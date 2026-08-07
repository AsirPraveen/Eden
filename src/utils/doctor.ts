const DR_PREFIX = /^(dr\.?|doctor)\s+/i;

/** Remove a leading Dr / Doctor prefix (case-insensitive). */
export function stripDoctorPrefix(name: string): string {
  return name.trim().replace(DR_PREFIX, "").trim();
}

/** Display name with exactly one "Dr." prefix for prescriptions and PDFs. */
export function formatDoctorDisplay(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return `Dr. ${stripDoctorPrefix(trimmed)}`;
}

/** Match a member display name to the clinic's printed doctor name. */
export function namesMatchDoctor(memberName: string, clinicDoctorName: string): boolean {
  const a = stripDoctorPrefix(memberName).toLowerCase();
  const b = stripDoctorPrefix(clinicDoctorName).toLowerCase();
  if (!a || !b) return false;
  return a === b;
}

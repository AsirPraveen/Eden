import { Ionicons } from "@expo/vector-icons";

/**
 * Default medicine form types. "injection" removed per doctor feedback;
 * "softgel" and "soap" added. Shared by new-medicine and edit-medicine screens.
 */
export const DEFAULT_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "softgel",
  "soap",
  "drops",
  "ointment",
  "powder",
  "other",
] as const;

/** Map form → default unit string. Falls back to "unit" for unknowns. */
export const UNIT_FOR: Record<string, string> = {
  tablet: "tab",
  capsule: "cap",
  syrup: "bottle",
  softgel: "cap",
  soap: "pc",
  drops: "bottle",
  ointment: "tube",
  powder: "sachet",
  other: "unit",
};

/** Map form → Ionicons icon name. Falls back to "cube-outline" for unknowns. */
export const ICON_FOR: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  tablet: "ellipse-outline",
  capsule: "medical-outline",
  syrup: "flask-outline",
  softgel: "medical-outline",
  soap: "water-outline",
  drops: "water-outline",
  ointment: "color-fill-outline",
  powder: "cafe-outline",
  other: "cube-outline",
};

/** Get the unit for a form, with fallback for custom forms. */
export function unitForForm(form: string): string {
  return UNIT_FOR[form] ?? "unit";
}

/** Get the icon for a form, with fallback for custom forms. */
export function iconForForm(form: string): React.ComponentProps<typeof Ionicons>["name"] {
  return ICON_FOR[form] ?? "cube-outline";
}

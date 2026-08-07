/** Per-field validation messages. Use `_form` for errors that are not tied to one field. */
export type FieldErrors<T extends string = string> = Partial<Record<T | "_form", string>>;

export const EMPTY_FIELD_ERRORS: FieldErrors = {};

export function fieldError(errors: FieldErrors, field: string): string | undefined {
  return errors[field];
}

export function withoutField<T extends string>(errors: FieldErrors<T>, field: T | "_form"): FieldErrors<T> {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}

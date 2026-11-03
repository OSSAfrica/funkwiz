/** Reserved documentation addresses are public examples, not private identity metadata. */
export function isPrivateSettingValue(
  key: string,
  value: unknown,
): value is string {
  if (typeof value !== "string" || value.length < 8) return false;
  if (key === "TEACHER_EMAIL" || key === "teacherEmail") {
    const domain = value.trim().toLowerCase().split("@")[1] ?? "";
    if (
      ["example.com", "example.net", "example.org"].some(
        (example) => domain === example || domain.endsWith(`.${example}`),
      ) ||
      [".example", ".invalid", ".test"].some((suffix) =>
        domain.endsWith(suffix),
      )
    )
      return false;
  }
  return true;
}

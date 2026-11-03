/** Only RFC1918 IPv4 addresses are supported by the first classroom launcher. */
export function privateIPv4(address: string) {
  const parts = address.split(".");
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)
  )
    return false;
  const [a, b] = parts.map(Number);
  return (
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  );
}

export type ClassroomSettings = {
  FUNKWIZ_LOCAL_CLASSROOM?: string;
  FUNKWIZ_MODE?: string;
  BETTER_AUTH_URL?: string;
};

export function classroomOrigin(settings: ClassroomSettings): string | null {
  if (
    settings.FUNKWIZ_LOCAL_CLASSROOM !== "true" ||
    settings.FUNKWIZ_MODE !== "personal"
  )
    return null;
  try {
    const url = new URL(settings.BETTER_AUTH_URL ?? "");
    return url.protocol === "http:" &&
      privateIPv4(url.hostname) &&
      !url.username &&
      !url.password &&
      url.href === url.origin + "/"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

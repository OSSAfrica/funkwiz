import { privateIPv4 } from "../../src/lib/classroom-policy";
import type { NetworkInterfaceInfo } from "node:os";

export function classroomAddresses(
  interfaces: Record<string, NetworkInterfaceInfo[] | undefined>,
) {
  return Object.entries(interfaces).flatMap(([name, entries]) =>
    (entries ?? [])
      .filter(
        (entry) =>
          !entry.internal &&
          entry.family === "IPv4" &&
          privateIPv4(entry.address),
      )
      .map((entry) => ({ name, address: entry.address })),
  );
}

export function classroomPort(value: string) {
  if (!/^\d+$/.test(value) || Number(value) < 1024 || Number(value) > 65535)
    throw new Error("Choose a port between 1024 and 65535.");
  return Number(value);
}

export function classroomEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error(
      "Provide a valid teacher email address. No email will be sent.",
    );
  return email;
}

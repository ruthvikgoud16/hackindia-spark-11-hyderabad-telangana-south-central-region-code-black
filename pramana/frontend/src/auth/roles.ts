/** Shared role stamps for role-based login / signup */
import type { Role } from "../api/client";

export const ROLES: {
  id: Role;
  label: string;
  blurb: string;
  stamp: string;
}[] = [
  { id: "employee", label: "Employee", blurb: "Internal policies", stamp: "L2" },
  { id: "analyst", label: "Analyst", blurb: "Confidential finance", stamp: "L3" },
  { id: "manager", label: "Manager", blurb: "Restricted foresight", stamp: "L3" },
  { id: "compliance", label: "Compliance", blurb: "Full audit reach", stamp: "L4" },
];

export function clearanceFor(role: Role) {
  return ROLES.find((r) => r.id === role)?.stamp ?? "L2";
}

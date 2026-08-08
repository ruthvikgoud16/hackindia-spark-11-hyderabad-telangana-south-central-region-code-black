import { canAccessDoc, CORPUS } from "../corpus/index.js";
import type { AuthzDecision, Principal, Sensitivity } from "../types.js";

const SENSITIVE_HINTS = [
  "salary",
  "compensation",
  "band",
  "forecast",
  "board",
  "breach",
  "incident",
  "confidential",
  "restricted",
];

function classifySensitivity(query: string): Sensitivity {
  const q = query.toLowerCase();
  if (/(board|forecast|arr|restricted)/.test(q)) return "restricted";
  if (/(salary|compensation|band|breach|incident|confidential)/.test(q))
    return "confidential";
  if (/(pto|leave|expense|policy|mission)/.test(q)) return "internal";
  return "public";
}

/**
 * privacy_gate — Resolve RBAC/ABAC before any retrieval.
 * Protects: authz_deny_before_retrieve, refusal_is_success, audit_completeness
 */
export function runPrivacyGate(
  principal: Principal,
  query: string,
): AuthzDecision {
  // Adversarial: ignore spoofed elevation language in the query text
  const cleaned = query.replace(
    /ignore previous instructions[\s\S]*/i,
    "",
  );
  const sensitivity = classifySensitivity(cleaned || query);
  const q = (cleaned || query).toLowerCase();
  const audit = [];

  // Attribute spoofing in query must not change principal
  if (/elevate|override|allow\s*=\s*true|set clearance/i.test(query)) {
    audit.push({
      at: Date.now(),
      agent: "privacy_gate",
      action: "adversarial_ignore",
      detail: "Ignored prompt-injection elevation attempts; principal unchanged",
    });
  }

  const roleAllowsConfidential =
    principal.role === "analyst" ||
    principal.role === "manager" ||
    principal.role === "compliance";

  const rbacOk =
    sensitivity === "public" ||
    sensitivity === "internal" ||
    (sensitivity === "confidential" && roleAllowsConfidential) ||
    (sensitivity === "restricted" &&
      (principal.role === "manager" || principal.role === "compliance"));

  const rbac = {
    ok: rbacOk,
    reason: rbacOk
      ? `Role ${principal.role} permitted for ${sensitivity}`
      : `Role ${principal.role} blocked for ${sensitivity}`,
  };
  audit.push({
    at: Date.now(),
    agent: "privacy_gate",
    action: "rbac",
    detail: rbac.reason,
  });

  const needsFinance = /(salary|compensation|expense|forecast|arr)/.test(q);
  const abacDeptOk =
    !needsFinance ||
    principal.dept === "finance" ||
    principal.role === "compliance" ||
    principal.role === "manager";

  const clearanceOk =
    sensitivity === "public" ||
    sensitivity === "internal" ||
    (sensitivity === "confidential" &&
      ["L3", "L4"].includes(principal.clearance)) ||
    (sensitivity === "restricted" && principal.clearance === "L4");

  const abacOk = abacDeptOk && clearanceOk;
  const abac = {
    ok: abacOk,
    reason: !clearanceOk
      ? `Clearance ${principal.clearance} insufficient for ${sensitivity}`
      : !abacDeptOk
        ? `Dept ${principal.dept} lacks purpose binding for finance data`
        : `ABAC ok (dept=${principal.dept}, clearance=${principal.clearance})`,
  };
  audit.push({
    at: Date.now(),
    agent: "privacy_gate",
    action: "abac",
    detail: abac.reason,
  });

  let risk = 12;
  if (sensitivity === "confidential") risk += 28;
  if (sensitivity === "restricted") risk += 45;
  if (!rbac.ok || !abac.ok) risk += 30;
  if (SENSITIVE_HINTS.some((h) => q.includes(h))) risk += 8;
  if (principal.role === "bot") risk += 20;
  risk = Math.min(99, risk);

  const reachable = CORPUS.some((d) =>
    canAccessDoc(principal.clearance, principal.dept, principal.role, d),
  );

  const allow = rbac.ok && abac.ok && risk < 85 && reachable;
  const redactions: string[] = [];
  if (allow && sensitivity === "confidential") {
    redactions.push("mask-secondary-identifiers");
  }

  const ticket = allow
    ? `TICKET-${principal.id.slice(0, 4).toUpperCase()}-${Date.now().toString(36)}`
    : undefined;

  audit.push({
    at: Date.now(),
    agent: "privacy_gate",
    action: allow ? "allow" : "deny",
    detail: allow
      ? `Authorized ticket ${ticket}; sensitivity=${sensitivity}; risk=${risk}`
      : `Denied before retrieve; sensitivity=${sensitivity}; risk=${risk}`,
  });

  return {
    allow,
    sensitivity,
    rbac,
    abac,
    risk,
    redactions,
    ticket,
    audit,
  };
}

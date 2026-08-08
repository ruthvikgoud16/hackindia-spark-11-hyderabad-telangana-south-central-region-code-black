export type UserRole =
  | "employee"
  | "manager"
  | "analyst"
  | "compliance"
  | "bot";

export type Clearance = "L1" | "L2" | "L3" | "L4";
export type Channel = "web" | "portal" | "slack" | "api";
export type Sensitivity = "public" | "internal" | "confidential" | "restricted";
export type ExpectedOutcome = "answer" | "refuse" | "deny";

export interface Principal {
  id: string;
  name: string;
  role: UserRole;
  dept: string;
  clearance: Clearance;
  channel: Channel;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  dept: string;
  sensitivity: Sensitivity;
  minClearance: Clearance;
  text: string;
  entities: string[];
}

export interface AuditEvent {
  at: number;
  agent: string;
  action: string;
  detail: string;
  evidenceRefs?: string[];
}

export interface AuthzDecision {
  allow: boolean;
  sensitivity: Sensitivity;
  rbac: { ok: boolean; reason: string };
  abac: { ok: boolean; reason: string };
  risk: number;
  redactions: string[];
  ticket?: string;
  audit: AuditEvent[];
}

export interface RetrievalHit {
  doc: KnowledgeDoc;
  score: number;
  snippet: string;
  vectorScore: number;
  graphScore: number;
}

export interface RetrievalResult {
  hits: RetrievalHit[];
  ticket: string;
  authorizedDocCount: number;
  retrieved: boolean;
  linkedEntities: string[];
  subgraph: Record<string, string[]>;
  audit: AuditEvent[];
}

export interface DraftResult {
  draft: string;
  usedDocIds: string[];
  audit: AuditEvent[];
}

export interface Claim {
  text: string;
  supported: boolean;
  evidenceIds: string[];
  confidence: number;
}

export interface VerifyResult {
  claims: Claim[];
  evidenceMap: Record<string, string[]>;
  audit: AuditEvent[];
}

export interface FactcheckResult {
  hallucinationDetected: boolean;
  confidence: number;
  refuse: boolean;
  refuseReason?: string;
  citations: { docId: string; title: string }[];
  claims: Claim[];
  audit: AuditEvent[];
}

export interface GovernResult {
  trustScore: number;
  provenance: {
    ticket?: string;
    sensitivity?: Sensitivity;
    docIds: string[];
    entities: string[];
  };
  audit: AuditEvent[];
  sealedAt: number;
}

export interface TrustOutput {
  kind: "answer" | "refusal";
  response: string;
  confidence: number;
  explanation: string[];
  citations: { docId: string; title: string }[];
  trustScore: number;
  audit: AuditEvent[];
  gaps?: string[];
}

export interface AgentHop {
  agent: string;
  status: "passed" | "denied" | "failed" | "skipped";
  detail: string;
  startedAt: number;
  finishedAt: number;
}

export interface PipelineResult {
  hops: AgentHop[];
  authz: AuthzDecision;
  retrieval?: RetrievalResult;
  draft?: DraftResult;
  verify?: VerifyResult;
  factcheck?: FactcheckResult;
  govern: GovernResult;
  output: TrustOutput;
  /** Explicit tool invocations for sophistication / Helix trace richness */
  tools: {
    tool: string;
    ok: boolean;
    at: number;
    ms: number;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }[];
  trigger?: {
    kind: string;
    source: string;
    correlationId: string;
    ticketRef?: string;
  };
  helix: {
    stageHint: "evaluate" | "diagnose" | "govern";
    note: string;
  };
}

export type EvalCriterionId =
  | "authz_deny_before_retrieve"
  | "citation_grounding"
  | "hallucination_refuse"
  | "refusal_is_success"
  | "audit_completeness";

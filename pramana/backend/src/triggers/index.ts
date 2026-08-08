/**
 * Ingress triggers — how real jobs enter PRAMĀṆA.
 * Supports web/portal/slack/api plus webhook + schedule stubs.
 */
export type TriggerKind =
  | "interactive"
  | "webhook"
  | "slack_mention"
  | "api_job"
  | "schedule";

export interface TriggerEvent {
  kind: TriggerKind;
  source: string;
  receivedAt: number;
  correlationId: string;
  payload: {
    query: string;
    principalId?: string;
    channel?: string;
    /** External system ids (ServiceNow, Zendesk, etc.) */
    ticketRef?: string;
    metadata?: Record<string, unknown>;
  };
}

export function normalizeTrigger(raw: {
  kind?: string;
  source?: string;
  query: string;
  principalId?: string;
  channel?: string;
  ticketRef?: string;
  metadata?: Record<string, unknown>;
}): TriggerEvent {
  const kind = (raw.kind as TriggerKind) || "interactive";
  return {
    kind,
    source: raw.source ?? "direct",
    receivedAt: Date.now(),
    correlationId: `trg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    payload: {
      query: raw.query,
      principalId: raw.principalId,
      channel: raw.channel,
      ticketRef: raw.ticketRef,
      metadata: raw.metadata,
    },
  };
}

/**
 * Explicit tool surface — real jobs the MultiAgent can invoke.
 * Each call is audited; nothing here mutates Helix Optimize paths.
 */
export type ToolName =
  | "policy.check"
  | "corpus.search"
  | "graph.expand"
  | "claims.extract"
  | "evidence.bind"
  | "hallucination.scan"
  | "audit.seal"
  | "notify.compliance"
  | "compass.verify"; // optional judge-only external validation

export interface ToolCall {
  tool: ToolName;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  ok: boolean;
  at: number;
  ms: number;
}

export class ToolBus {
  readonly calls: ToolCall[] = [];

  run<T>(
    tool: ToolName,
    input: Record<string, unknown>,
    fn: () => T,
  ): T {
    const start = Date.now();
    try {
      const output = fn();
      this.calls.push({
        tool,
        input,
        output: output as unknown as Record<string, unknown>,
        ok: true,
        at: start,
        ms: Date.now() - start,
      });
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.calls.push({
        tool,
        input,
        output: { error: message },
        ok: false,
        at: start,
        ms: Date.now() - start,
      });
      throw err;
    }
  }
}

/**
 * WebMCP progressive enhancement (https://github.com/webmachinelearning/webmcp).
 *
 * If the browser exposes `navigator.modelContext`, register tools that let an
 * AI agent drive the EXISTING notes app. Absent → no-op. Never throws.
 * No processing logic lives here — tools only call callbacks the app passes in.
 */

export interface WebMcpResult {
  content: { type: "text"; text: string }[];
}

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<WebMcpResult>;
}

interface ModelContextLike {
  registerTool?: (tool: WebMcpTool) => unknown;
  unregisterTool?: (name: string) => unknown;
  provideContext?: (ctx: { tools: WebMcpTool[] }) => unknown;
}

export const text = (t: string): WebMcpResult => ({ content: [{ type: "text", text: t }] });

/** Wrap execute so a tool can never throw into the agent/runtime. */
function safe(tool: WebMcpTool): WebMcpTool {
  return {
    ...tool,
    execute: async (args) => {
      try {
        return await tool.execute(args ?? {});
      } catch (e) {
        return text(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

/** Register tools; returns a cleanup function (also never throws). */
export function registerWebMcpTools(tools: WebMcpTool[]): () => void {
  try {
    if (typeof navigator === "undefined") return () => {};
    const mc = (navigator as unknown as { modelContext?: ModelContextLike }).modelContext;
    if (!mc) return () => {};
    const wrapped = tools.map(safe);
    if (typeof mc.registerTool === "function") {
      const handles: unknown[] = [];
      for (const t of wrapped) {
        try {
          handles.push(mc.registerTool(t));
        } catch {
          /* ignore individual failures */
        }
      }
      return () => {
        try {
          for (const h of handles) {
            if (h && typeof (h as { unregister?: () => void }).unregister === "function") {
              (h as { unregister: () => void }).unregister();
            }
          }
          if (typeof mc.unregisterTool === "function") {
            for (const t of wrapped) {
              try {
                mc.unregisterTool(t.name);
              } catch {
                /* ignore */
              }
            }
          }
        } catch {
          /* ignore */
        }
      };
    }
    if (typeof mc.provideContext === "function") {
      mc.provideContext({ tools: wrapped });
      return () => {
        try {
          mc.provideContext?.({ tools: [] });
        } catch {
          /* ignore */
        }
      };
    }
  } catch {
    /* never throw */
  }
  return () => {};
}

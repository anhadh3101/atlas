import { createTypeScriptDependencyGraph } from '../map/typescript/createTypeScriptGraph.js'
import type { TypeScriptDependencyGraph } from '../map/typescript/types.js';

import { string, z } from 'zod';
import path from 'node:path';

export interface AtlasToolResult {
    content: string;
    isError?: boolean;
}

const atlasInputSchema = z.object({
    rootPath: z.string().describe("Absolute path to the project root"),
    language: z.enum(["typescript"]).default("typescript"),
    tsconfigPath: z.string().optional(),
    format: z.enum(["summary", "json"]).default("summary"),
});

function formatSummary(graph: TypeScriptDependencyGraph): string {
    const lines = [
      `Nodes: ${graph.nodes.length}`,
      `Edges: ${graph.edges.length}`,
      `Unresolved: ${graph.unresolved.length}`,
    ];
  
    if (graph.unresolved.length > 0) {
      lines.push("", "Unresolved imports:");
      for (const u of graph.unresolved.slice(0, 20)) {
        lines.push(`  ${u.source} → ${u.specifier}`);
      }
      if (graph.unresolved.length > 20) {
        lines.push(`  ... and ${graph.unresolved.length - 20} more`);
      }
    }
  
    return lines.join("\n");
}

export async function executeAtlas(rawInput: unknown) {
    try {
        const input = atlasInputSchema.parse(rawInput);
        const projectRoot = path.resolve(input.rootPath);

        if (input.language === "typescript") {
            const graph = createTypeScriptDependencyGraph({
                projectRoot,
            });

            return {
                content:
                    input.format === "json" ? JSON.stringify(graph, null, 2) : formatSummary(graph),
            };
        }

        return { content: `Unsupported language: ${input.language}`, isError: true };
    } catch (err) {
        return {
            content: err instanceof Error ? err.message : String(err),
            isError: true,
        };
    }
}

export const atlasTool = {
    name: "atlas",
    description:
        "Build a dependency graph of a codebase to understand imports and module relationships.",
    inputSchema: atlasInputSchema,
    execute: executeAtlas,
} as const;
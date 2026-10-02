import { z } from "zod";
import { preProcessingGitFiles } from "../rlm/pre-processing/pre-processing.js";
import { formatExecError } from "../utils/git.js";

export interface AtlasToolResult {
  content: string;
  isError?: boolean;
}

const atlasInputSchema = z.object({
  pullRequest: z.number().int().positive().describe("Pull request number"),
  format: z.enum(["summary", "json"]).default("summary"),
});

function formatSummary(pullRequest: number, filePaths: string[]): string {
  const lines = [
    `PR #${pullRequest}`,
    `Changed files: ${filePaths.length}`,
    "",
    ...filePaths,
  ];

  return lines.join("\n");
}

export async function executeAtlas(rawInput: unknown): Promise<AtlasToolResult> {
  try {
    const input = atlasInputSchema.parse(rawInput);
    const projectRoot = process.env.CLAUDE_PROJECT_DIR;

    if (!projectRoot) {
      return {
        content: "CLAUDE_PROJECT_DIR was not provided by the MCP client",
        isError: true,
      };
    }

    const filePaths = await preProcessingGitFiles(
      projectRoot,
      input.pullRequest,
    );

    if (input.format === "json") {
      return {
        content: JSON.stringify(
          { pullRequest: input.pullRequest, filePaths },
          null,
          2,
        ),
      };
    }

    return {
      content: formatSummary(input.pullRequest, filePaths),
    };
  } catch (err) {
    return {
      content: formatExecError(err),
      isError: true,
    };
  }
}

export const atlasTool = {
  name: "atlas",
  description:
    "List files changed in a GitHub pull request for the current Claude Code project.",
  inputSchema: atlasInputSchema,
  execute: executeAtlas,
} as const;

import { z } from "zod";
import { preProcessingGitFiles } from "../rlm/pre-processing/pre-processing.js";
import { summarizeWithClaude } from "../rlm/summarize/llm.js";
import { summarizePaths } from "../rlm/summarize/summarizePaths.js";
import { createFileDiffLoader, formatExecError } from "../utils/git.js";

export interface AtlasToolResult {
  content: string;
  isError?: boolean;
}

const atlasInputSchema = z.object({
  pullRequest: z.number().int().positive().describe("Pull request number"),
  format: z.enum(["summary", "json"]).default("summary"),
});

function formatSummary(
  pullRequest: number,
  filePaths: string[],
  summary: string,
): string {
  const lines = [
    `PR #${pullRequest}`,
    `Changed files: ${filePaths.length}`,
    "",
    ...filePaths,
    "",
    summary,
  ];

  return lines.join("\n");
}

export async function executeAtlas(rawInput: unknown): Promise<AtlasToolResult> {
  try {
    // Parse the input to get the input schema (PR number for the workspace)
    const input = atlasInputSchema.parse(rawInput);

    // Set the project root to the workspace claude code is initialized in
    const projectRoot = process.env.CLAUDE_PROJECT_DIR;

    if (!projectRoot) {
      return {
        content: "CLAUDE_PROJECT_DIR was not provided by the MCP client",
        isError: true,
      };
    }

    // ---------------------------------------- PRE-PROCESSING ----------------------------------------//
    // STEP-1: Get the diff files from the gh CLI which we are going to use for building the context
    const filePaths = await preProcessingGitFiles(
      projectRoot,
      input.pullRequest,
    );

    // STEP-2: Load each diff only while it fits the window, then merge the briefs.
    const summary =
      filePaths.length === 0
        ? "No source files to summarize."
        : await summarizePaths(filePaths, {
            fetchFileDiff: createFileDiffLoader(projectRoot, input.pullRequest),
            llm: summarizeWithClaude,
          });

    if (input.format === "json") {
      return {
        content: JSON.stringify(
          { pullRequest: input.pullRequest, filePaths, summary },
          null,
          2,
        ),
      };
    }

    return {
      content: formatSummary(input.pullRequest, filePaths, summary),
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
    "Summarize the source files changed in a GitHub pull request for the current Claude Code project.",
  inputSchema: atlasInputSchema,
  execute: executeAtlas,
} as const;

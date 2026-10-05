import { execFile } from "node:child_process";

const CLAUDE_MAX_BUFFER = 10 * 1024 * 1024;

export async function summarizeWithClaude(
  instruction: string,
  context: string,
): Promise<string> {
  const args = [
    "-p",
    "--safe-mode",
    "--tools",
    "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--output-format",
    "text",
  ];

  const model = process.env.ATLAS_SUMMARY_MODEL;
  if (model) {
    args.push("--model", model);
  }

  // Tools and MCP are disabled so a summary call cannot invoke atlas again.
  // The prompt is written to stdin because a diff can exceed the argv limit.
  return new Promise((resolve, reject) => {
    const child = execFile(
      "claude",
      args,
      { encoding: "utf8", maxBuffer: CLAUDE_MAX_BUFFER },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const text = stdout.trim();
        if (!text) {
          reject(new Error("Claude returned an empty summary"));
          return;
        }

        resolve(text);
      },
    );

    child.stdin?.end(`${instruction}\n\n${context}`);
  });
}

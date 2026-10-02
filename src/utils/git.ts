import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const GH_MAX_BUFFER = 10 * 1024 * 1024;

const ghPrFilesSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      additions: z.number(),
      deletions: z.number(),
      changeType: z.string().optional(),
    }),
  ),
});

export function formatExecError(err: unknown): string {
  if (err instanceof Error && "stderr" in err) {
    const execErr = err as Error & { stderr?: string | Buffer };
    const stderr =
      typeof execErr.stderr === "string"
        ? execErr.stderr.trim()
        : execErr.stderr?.toString().trim();
    return stderr || execErr.message;
  }

  return err instanceof Error ? err.message : String(err);
}

async function runGh(projectRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("gh", args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: GH_MAX_BUFFER,
  });

  return stdout;
}

export async function fetchPrChangedFiles(
  projectRoot: string,
  pullRequest: number,
): Promise<string[]> {
  const stdout = await runGh(projectRoot, [
    "pr",
    "view",
    String(pullRequest),
    "--json",
    "files",
  ]);

  const parsed = ghPrFilesSchema.parse(JSON.parse(stdout));
  const root = path.resolve(projectRoot);

  return parsed.files.map((file) => path.resolve(root, file.path));
}

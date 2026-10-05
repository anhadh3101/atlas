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

function relativeRepoPath(projectRoot: string, filePath: string): string {
  const root = path.resolve(projectRoot);
  const absolute = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(root, filePath);

  return path.relative(root, absolute).split(path.sep).join("/");
}

function diffGitPaths(header: string): string[] {
  const rest = header.slice("diff --git ".length);
  const tokens = rest.match(/"(?:\\.|[^"\\])*"|[^\s]+/g) ?? [];
  const paths = tokens.map((token) => {
    const unquoted = token.startsWith('"')
      ? token.slice(1, -1).replace(/\\(["\\])/g, "$1")
      : token;

    return unquoted.replace(/^[ab]\//, "");
  });

  return [...new Set(paths)];
}

export function indexDiffByFile(diff: string): Map<string, string> {
  const indexed = new Map<string, string>();
  let paths: string[] = [];
  let body: string[] = [];

  const flush = () => {
    if (paths.length === 0) return;
    const text = body.join("\n");
    for (const filePath of paths) {
      indexed.set(filePath, text);
    }
  };

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      flush();
      paths = diffGitPaths(line);
      body = [line];
      continue;
    }

    if (paths.length > 0) body.push(line);
  }

  flush();
  return indexed;
}

async function fetchIndexedPrDiff(
  projectRoot: string,
  pullRequest: number,
): Promise<Map<string, string>> {
  // gh pr diff has no per-file filter, so the patch is fetched once and sliced
  // when a recursive call asks for one path.
  const stdout = await runGh(projectRoot, [
    "pr",
    "diff",
    String(pullRequest),
    "--color=never",
  ]);

  return indexDiffByFile(stdout);
}

export function createFileDiffLoader(
  projectRoot: string,
  pullRequest: number,
): (filePath: string) => Promise<string> {
  let indexed: Promise<Map<string, string>> | undefined;

  return async (filePath: string) => {
    indexed ??= fetchIndexedPrDiff(projectRoot, pullRequest);
    const files = await indexed;
    return files.get(relativeRepoPath(projectRoot, filePath)) ?? "";
  };
}

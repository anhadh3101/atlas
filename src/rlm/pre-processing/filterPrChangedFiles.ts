import path from "node:path";

const GRAPH_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const EXCLUDED_PATH_SEGMENTS = new Set([
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  ".next",
  "docs",
]);

const EXCLUDED_BASENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "bun.lock",
  "bun.lockb",
  ".DS_Store",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".map",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp3",
  ".mp4",
  ".wav",
  ".webm",
]);

const EXCLUDED_PATH_PREFIXES = [".vscode/", ".idea/"];

function shouldIncludePrChangedFile(filePath: string): boolean {
  const normalized = filePath.split(path.sep).join("/");
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (EXCLUDED_BASENAMES.has(basename)) {
    return false;
  }

  if (EXCLUDED_EXTENSIONS.has(ext)) {
    return false;
  }

  if (basename.endsWith(".d.ts")) {
    return false;
  }

  for (const segment of filePath.split(path.sep)) {
    if (EXCLUDED_PATH_SEGMENTS.has(segment)) {
      return false;
    }
  }

  for (const prefix of EXCLUDED_PATH_PREFIXES) {
    if (normalized.includes(prefix)) {
      return false;
    }
  }

  return GRAPH_SOURCE_EXTENSIONS.has(ext);
}

export function filterPrChangedFiles(filePaths: string[]): string[] {
  return filePaths.filter(shouldIncludePrChangedFile);
}

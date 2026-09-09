import path from "node:path";

export function normalizeId(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

export function isInside(projectRoot: string, filePath: string): boolean {
  const relative = path.relative(projectRoot, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function isNodeModules(filePath: string): boolean {
  return filePath.split(path.sep).includes("node_modules");
}

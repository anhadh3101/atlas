import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createTypeScriptDependencyGraph } from "#atlas/map/typescript/createTypeScriptGraph.js";
import { assertValidDependencyGraph } from "./helpers/graphAssertions.js";

const atlasRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const workspaceRoot = path.resolve(atlasRoot, "..");

const realProjects = [
  {
    label: "codegoat-cli",
    projectRoot: path.join(workspaceRoot, "codegoat-cli"),
  },
  {
    label: "agentrail",
    projectRoot: path.join(workspaceRoot, "agentrail"),
  },
] as const;

for (const { label, projectRoot } of realProjects) {
  test(`createTypeScriptDependencyGraph builds a valid graph for ${label}`, () => {
    const graph = createTypeScriptDependencyGraph({ projectRoot });

    assertValidDependencyGraph(graph, label);
    assert.ok(
      graph.edges.length > 0,
      `${label}: expected at least one edge in a real project`,
    );
  });
}

test("createTypeScriptDependencyGraph accepts relative and absolute projectRoot", () => {
  const absoluteProjectRoot = path.join(workspaceRoot, "codegoat-cli");
  const relativeProjectRoot = path.relative(process.cwd(), absoluteProjectRoot);

  const absoluteGraph = createTypeScriptDependencyGraph({
    projectRoot: absoluteProjectRoot,
  });
  const relativeGraph = createTypeScriptDependencyGraph({
    projectRoot: relativeProjectRoot,
  });

  assert.deepEqual(relativeGraph, absoluteGraph);
});

test("createTypeScriptDependencyGraph throws when projectRoot has no tsconfig", () => {
  const missingConfigDir = mkdtempSync(path.join(os.tmpdir(), "atlas-no-tsconfig-"));

  try {
    assert.throws(
      () =>
        createTypeScriptDependencyGraph({
          projectRoot: missingConfigDir,
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /No tsconfig\.json found under/);
        return true;
      },
    );
  } finally {
    rmSync(missingConfigDir, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { filterPrChangedFiles } from "#atlas/rlm/pre-processing/filterPrChangedFiles.js";

test("filterPrChangedFiles keeps Python source files", () => {
  const input = [
    "/repo/taskman/service.py",
    "/repo/tests/test_service.py",
    "/repo/taskman/models.pyi",
  ];

  assert.deepEqual(filterPrChangedFiles(input), input);
});

test("filterPrChangedFiles removes Python artifact paths", () => {
  const input = [
    "/repo/taskman/service.py",
    "/repo/taskman/__pycache__/service.cpython-312.pyc",
    "/repo/.venv/lib/python3.12/site-packages/pkg/mod.py",
    "/repo/venv/lib/mod.py",
  ];

  assert.deepEqual(filterPrChangedFiles(input), ["/repo/taskman/service.py"]);
});

test("filterPrChangedFiles keeps TypeScript and JavaScript source files", () => {
  const input = [
    "/repo/src/index.ts",
    "/repo/src/app.tsx",
    "/repo/lib/util.mjs",
    "/repo/scripts/run.cjs",
  ];

  assert.deepEqual(filterPrChangedFiles(input), input);
});

test("filterPrChangedFiles removes non-source and generated paths", () => {
  const input = [
    "/repo/src/index.ts",
    "/repo/README.md",
    "/repo/package-lock.json",
    "/repo/dist/index.js",
    "/repo/node_modules/lodash/index.js",
    "/repo/coverage/lcov-report/index.js",
    "/repo/assets/logo.png",
    "/repo/src/types.d.ts",
    "/repo/.vscode/settings.json",
  ];

  assert.deepEqual(filterPrChangedFiles(input), ["/repo/src/index.ts"]);
});

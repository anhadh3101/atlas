import assert from "node:assert/strict";
import test from "node:test";
import { executeAtlas } from "#atlas/tools/atlas.js";

test("executeAtlas returns an error when CLAUDE_PROJECT_DIR is missing", async () => {
  const original = process.env.CLAUDE_PROJECT_DIR;
  delete process.env.CLAUDE_PROJECT_DIR;

  try {
    const result = await executeAtlas({ pullRequest: 1 });

    assert.equal(result.isError, true);
    assert.match(result.content, /CLAUDE_PROJECT_DIR/);
  } finally {
    if (original === undefined) {
      delete process.env.CLAUDE_PROJECT_DIR;
    } else {
      process.env.CLAUDE_PROJECT_DIR = original;
    }
  }
});

test("executeAtlas rejects invalid pull request numbers", async () => {
  process.env.CLAUDE_PROJECT_DIR = "/tmp/project";

  const result = await executeAtlas({ pullRequest: 0 });

  assert.equal(result.isError, true);
});

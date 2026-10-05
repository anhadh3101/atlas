import assert from "node:assert/strict";
import test from "node:test";
import { indexDiffByFile } from "#atlas/utils/git.js";

test("indexDiffByFile slices a pull request diff by path", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -1 +1 @@",
    "-old",
    "+new",
    "diff --git a/src/old.ts b/src/new.ts",
    "rename from src/old.ts",
    "rename to src/new.ts",
    "diff --git \"a/my file.ts\" \"b/my file.ts\"",
    "@@ -1 +1 @@",
    "+spaced",
  ].join("\n");

  const indexed = indexDiffByFile(diff);

  assert.match(indexed.get("src/a.ts") ?? "", /\+new/);
  assert.match(indexed.get("src/old.ts") ?? "", /rename to/);
  assert.match(indexed.get("src/new.ts") ?? "", /rename to/);
  assert.match(indexed.get("my file.ts") ?? "", /\+spaced/);
  assert.equal(indexed.has("src/a.ts\n"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { splitIntoFittingParts } from "#atlas/rlm/summarize/contextBudget.js";
import {
  COMPRESS_SUMMARY_INSTRUCTION,
  MERGE_SUMMARIES_INSTRUCTION,
  SUMMARIZE_DIFFS_INSTRUCTION,
  SUMMARIZE_HUNKS_INSTRUCTION,
  summarizePaths,
} from "#atlas/rlm/summarize/summarizePaths.js";

test("splitIntoFittingParts keeps every part inside the budget", () => {
  const text = ["aaaa", "b".repeat(25), "cc"].join("\n");
  const parts = splitIntoFittingParts(text, 10);

  assert.ok(parts.length > 1);
  for (const part of parts) {
    assert.ok(part.length <= 10);
  }
  assert.equal(parts.join(""), ["aaaa", "b".repeat(25), "cc"].join(""));
});

test("summarizePaths returns an empty string when there are no files", async () => {
  let fetched = 0;

  const summary = await summarizePaths([], {
    fetchFileDiff: async () => {
      fetched += 1;
      return "";
    },
    llm: async () => "unused",
  });

  assert.equal(summary, "");
  assert.equal(fetched, 0);
});

test("summarizePaths summarizes fitting diffs in one call", async () => {
  const calls: string[] = [];

  const summary = await summarizePaths(["/repo/a.ts", "/repo/b.ts"], {
    maxChars: 500,
    fetchFileDiff: async (filePath) => `diff for ${filePath}`,
    llm: async (instruction, context) => {
      calls.push(instruction);
      assert.match(context, /\/repo\/a\.ts/);
      assert.match(context, /\/repo\/b\.ts/);
      return "combined";
    },
  });

  assert.equal(summary, "combined");
  assert.deepEqual(calls, [SUMMARIZE_DIFFS_INSTRUCTION]);
});

test("summarizePaths starts a new batch when the next diff does not fit", async () => {
  const fetched: string[] = [];
  const contexts: string[] = [];

  const summary = await summarizePaths(["/repo/a.ts", "/repo/b.ts", "/repo/c.ts"], {
    maxChars: 100,
    fetchFileDiff: async (filePath) => {
      fetched.push(filePath);
      return "x".repeat(30);
    },
    llm: async (instruction, context) => {
      contexts.push(`${instruction}\n${context}`);
      return "brief";
    },
  });

  assert.deepEqual(fetched, ["/repo/a.ts", "/repo/b.ts", "/repo/c.ts"]);
  assert.equal(summary, "brief");
  assert.equal(
    contexts.filter((context) => context.startsWith(SUMMARIZE_DIFFS_INSTRUCTION)).length,
    2,
  );
  assert.ok(contexts.some((context) => context.startsWith(MERGE_SUMMARIES_INSTRUCTION)));
});

test("summarizePaths splits an oversized diff into hunks before summarizing", async () => {
  const header = [
    "## /repo/src/a.ts",
    "diff --git a/src/a.ts b/src/a.ts",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
  ].join("\n");
  const hunk1 = `@@ -1 +1 @@\n+${"a".repeat(30)}`;
  const hunk2 = `@@ -2 +2 @@\n+${"b".repeat(30)}`;
  const part1 = `${header}\n${hunk1}`;
  const part2 = `${header}\n${hunk2}`;
  const full = `${header}\n${hunk1}\n${hunk2}`;
  const maxChars = Math.max(part1.length, part2.length);

  assert.ok(full.length > maxChars);
  assert.ok(`${part1}\n\n${part2}`.length > maxChars);

  const hunkCalls: string[] = [];
  const summary = await summarizePaths(["/repo/src/a.ts"], {
    maxChars,
    fetchFileDiff: async () => full.slice(header.indexOf("diff --git")),
    llm: async (instruction, context) => {
      if (instruction === SUMMARIZE_HUNKS_INSTRUCTION) {
        hunkCalls.push(context);
        assert.ok(context.length <= maxChars);
      }
      return "brief";
    },
  });

  assert.equal(summary, "brief");
  assert.equal(hunkCalls.length, 2);
  assert.match(hunkCalls[0] ?? "", /@@ -1/);
  assert.match(hunkCalls[1] ?? "", /@@ -2/);
});

test("summarizePaths returns both briefs when compression does not shrink them", async () => {
  const left = "L".repeat(30);
  const right = "R".repeat(30);

  const summary = await summarizePaths(["/repo/a.ts", "/repo/b.ts"], {
    maxChars: 40,
    fetchFileDiff: async () => "x".repeat(20),
    llm: async (instruction) => {
      if (instruction === SUMMARIZE_DIFFS_INSTRUCTION) return left;
      if (instruction === COMPRESS_SUMMARY_INSTRUCTION) return left;
      throw new Error(`unexpected instruction: ${instruction}`);
    },
  });

  assert.equal(summary, `${left}\n\n${left}`);
  assert.ok(summary.length > 40);
  assert.equal(right.length, left.length);
});

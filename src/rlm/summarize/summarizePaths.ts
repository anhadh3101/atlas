import {
  MAX_CONTEXT_CHARS,
  fits,
  splitIntoFittingParts,
} from "./contextBudget.js";

export const SUMMARIZE_DIFFS_INSTRUCTION =
  "Summarize these diffs. Keep behavior changes and risks.";

export const SUMMARIZE_HUNKS_INSTRUCTION =
  "Summarize these diff hunks. Keep behavior changes and risks.";

export const MERGE_SUMMARIES_INSTRUCTION =
  "Merge these summaries into one. Keep the findings.";

export const COMPRESS_SUMMARY_INSTRUCTION =
  "Compress this summary. Keep the findings.";

export interface SummarizeDeps {
  fetchFileDiff: (filePath: string) => Promise<string>;
  llm: (instruction: string, context: string) => Promise<string>;
  maxChars?: number;
}

interface ResolvedSummarizeDeps {
  fetchFileDiff: (filePath: string) => Promise<string>;
  llm: (instruction: string, context: string) => Promise<string>;
  maxChars: number;
}

function resolveDeps(deps: SummarizeDeps): ResolvedSummarizeDeps {
  return {
    fetchFileDiff: deps.fetchFileDiff,
    llm: deps.llm,
    maxChars: deps.maxChars ?? MAX_CONTEXT_CHARS,
  };
}

function joinBlocks(blocks: string[]): string {
  return blocks.join("\n\n");
}

function splitDiffIntoHunks(block: string): string[] {
  const lines = block.split("\n");
  const firstHunk = lines.findIndex((line) => line.startsWith("@@"));
  if (firstHunk === -1) return [];

  const header = lines.slice(0, firstHunk).join("\n");
  const hunks: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines.slice(firstHunk)) {
    if (line.startsWith("@@")) {
      if (current) hunks.push(current);
      current = [line];
      continue;
    }

    current?.push(line);
  }

  if (current) hunks.push(current);
  if (hunks.length < 2) return [];

  return hunks.map((hunk) => {
    const body = hunk.join("\n");
    return header ? `${header}\n${body}` : body;
  });
}

async function mergeSummaries(
  left: string,
  right: string,
  deps: ResolvedSummarizeDeps,
): Promise<string> {
  if (!left) return right;
  if (!right) return left;

  const combined = `${left}\n\n${right}`;
  if (fits(combined, deps.maxChars)) {
    return deps.llm(MERGE_SUMMARIES_INSTRUCTION, combined);
  }

  const shorterLeft = await deps.llm(COMPRESS_SUMMARY_INSTRUCTION, left);
  const shorterRight = await deps.llm(COMPRESS_SUMMARY_INSTRUCTION, right);
  const nextLeft = shorterLeft.length < left.length ? shorterLeft : left;
  const nextRight = shorterRight.length < right.length ? shorterRight : right;

  if (nextLeft === left && nextRight === right) {
    return combined;
  }

  return mergeSummaries(nextLeft, nextRight, deps);
}

async function summarizeLoaded(
  segments: string[],
  instruction: string,
  deps: ResolvedSummarizeDeps,
): Promise<string> {
  if (segments.length === 0) return "";

  const batch: string[] = [];

  for (let index = 0; index < segments.length; index++) {
    const block = segments[index]!;

    if (batch.length === 0 && !fits(block, deps.maxChars)) {
      const parts = splitIntoFittingParts(block, deps.maxChars);
      const brief = await summarizeLoaded(parts, instruction, deps);
      const rest = await summarizeLoaded(segments.slice(index + 1), instruction, deps);
      return mergeSummaries(brief, rest, deps);
    }

    if (batch.length > 0 && !fits(joinBlocks([...batch, block]), deps.maxChars)) {
      const brief = await deps.llm(instruction, joinBlocks(batch));
      const rest = await summarizeLoaded(segments.slice(index), instruction, deps);
      return mergeSummaries(brief, rest, deps);
    }

    batch.push(block);
  }

  return deps.llm(instruction, joinBlocks(batch));
}

async function summarizeOversizedDiff(
  block: string,
  deps: ResolvedSummarizeDeps,
): Promise<string> {
  const hunks = splitDiffIntoHunks(block);
  const segments =
    hunks.length > 1 ? hunks : splitIntoFittingParts(block, deps.maxChars);

  return summarizeLoaded(segments, SUMMARIZE_HUNKS_INSTRUCTION, deps);
}

async function summarizePathsFrom(
  paths: string[],
  deps: ResolvedSummarizeDeps,
  startBlock?: string,
): Promise<string> {
  if (paths.length === 0 && startBlock === undefined) return "";

  const batch: string[] = [];

  if (startBlock !== undefined) {
    if (!fits(startBlock, deps.maxChars)) {
      const brief = await summarizeOversizedDiff(startBlock, deps);
      const rest = await summarizePathsFrom(paths, deps);
      return mergeSummaries(brief, rest, deps);
    }

    batch.push(startBlock);
  }

  for (let index = 0; index < paths.length; index++) {
    const filePath = paths[index]!;
    const diff = await deps.fetchFileDiff(filePath);
    const block = `## ${filePath}\n${diff}`;

    if (batch.length === 0 && !fits(block, deps.maxChars)) {
      const brief = await summarizeOversizedDiff(block, deps);
      const rest = await summarizePathsFrom(paths.slice(index + 1), deps);
      return mergeSummaries(brief, rest, deps);
    }

    if (batch.length > 0 && !fits(joinBlocks([...batch, block]), deps.maxChars)) {
      const brief = await deps.llm(SUMMARIZE_DIFFS_INSTRUCTION, joinBlocks(batch));
      const rest = await summarizePathsFrom(paths.slice(index + 1), deps, block);
      return mergeSummaries(brief, rest, deps);
    }

    batch.push(block);
  }

  if (batch.length === 0) return "";
  return deps.llm(SUMMARIZE_DIFFS_INSTRUCTION, joinBlocks(batch));
}

export async function summarizePaths(
  paths: string[],
  deps: SummarizeDeps,
): Promise<string> {
  return summarizePathsFrom(paths, resolveDeps(deps));
}

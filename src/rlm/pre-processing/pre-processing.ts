import { filterPrChangedFiles } from "./filterPrChangedFiles.js";
import { fetchPrChangedFiles } from "../../utils/git.js";

export async function preProcessingGitFiles(
  projectRoot: string,
  pullRequest: number,
): Promise<string[]> {
  return filterPrChangedFiles(
    await fetchPrChangedFiles(projectRoot, pullRequest),
  );
}


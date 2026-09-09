import path from "node:path";
import ts from "typescript";
import { extractModuleReferences } from "./extractModuleReferences.js";
import { isInside, isNodeModules, normalizeId } from "./paths.js";
import type {
  CreateGraphOptions,
  DependencyEdge,
  TypeScriptDependencyGraph,
  UnresolvedDependency,
} from "./types.js";

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function resolveProjectRoot(projectRoot: string): string {
  return path.resolve(projectRoot);
}

function findTsConfig(projectRoot: string, tsconfigPath?: string): string {
  if (tsconfigPath) {
    const resolved = path.resolve(projectRoot, tsconfigPath);
    if (!ts.sys.fileExists(resolved)) {
      throw new Error(`TypeScript config not found: ${resolved}`);
    }

    return resolved;
  }

  const found = ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.json");
  if (!found) {
    throw new Error(`No tsconfig.json found under ${projectRoot}`);
  }

  return found;
}

function loadParsedConfig(configPath: string) {
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) {
    throw new Error(formatDiagnostic(loaded.error));
  }

  const parsed = ts.parseJsonConfigFileContent(
    loaded.config,
    ts.sys,
    path.dirname(configPath),
    { noEmit: true },
    configPath,
  );

  const errors = parsed.errors.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error(errors.map(formatDiagnostic).join("\n"));
  }

  return parsed;
}

function shouldIncludeSourceFile(
  sourceFile: ts.SourceFile,
  projectRoot: string,
): boolean {
  if (sourceFile.isDeclarationFile) {
    return false;
  }

  if (isNodeModules(sourceFile.fileName)) {
    return false;
  }

  return isInside(projectRoot, sourceFile.fileName);
}

function edgeKey(edge: DependencyEdge): string {
  return `${edge.source}|${edge.target}|${edge.specifier}|${edge.kind}`;
}

export function createTypeScriptDependencyGraph(
  options: CreateGraphOptions,
): TypeScriptDependencyGraph {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const configPath = findTsConfig(projectRoot, options.tsconfigPath);
  const parsed = loadParsedConfig(configPath);

  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });

  const moduleResolutionCache = ts.createModuleResolutionCache(
    projectRoot,
    (fileName) =>
      ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
    parsed.options,
  );

  const sourceFiles = program
    .getSourceFiles()
    .filter((sourceFile) => shouldIncludeSourceFile(sourceFile, projectRoot));

  const nodeIds = new Set(
    sourceFiles.map((sourceFile) => normalizeId(projectRoot, sourceFile.fileName)),
  );

  const edges = new Map<string, DependencyEdge>();
  const unresolved = new Map<string, UnresolvedDependency>();

  for (const sourceFile of sourceFiles) {
    const sourceId = normalizeId(projectRoot, sourceFile.fileName);
    const references = extractModuleReferences(sourceFile);

    for (const reference of references) {
      const resolution = ts.resolveModuleName(
        reference.specifier,
        sourceFile.fileName,
        parsed.options,
        ts.sys,
        moduleResolutionCache,
      );

      const resolvedFileName = resolution.resolvedModule?.resolvedFileName;
      if (!resolvedFileName) {
        const unresolvedKey = `${sourceId}|${reference.specifier}`;
        unresolved.set(unresolvedKey, {
          source: sourceId,
          specifier: reference.specifier,
        });
        continue;
      }

      if (isNodeModules(resolvedFileName) || !isInside(projectRoot, resolvedFileName)) {
        continue;
      }

      const targetId = normalizeId(projectRoot, resolvedFileName);
      if (!nodeIds.has(targetId)) {
        continue;
      }

      const edge: DependencyEdge = {
        source: sourceId,
        target: targetId,
        specifier: reference.specifier,
        kind: reference.kind,
      };

      edges.set(edgeKey(edge), edge);
    }
  }

  return {
    nodes: [...nodeIds].sort().map((id) => ({ id })),
    edges: [...edges.values()].sort((left, right) =>
      edgeKey(left).localeCompare(edgeKey(right)),
    ),
    unresolved: [...unresolved.values()].sort((left, right) =>
      `${left.source}|${left.specifier}`.localeCompare(
        `${right.source}|${right.specifier}`,
      ),
    ),
  };
}

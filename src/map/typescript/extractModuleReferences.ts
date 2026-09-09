import ts from "typescript";
import type { DependencyEdgeKind } from "./types.js";

export interface ModuleReference {
  specifier: string;
  kind: DependencyEdgeKind;
}

function stringLiteralFromExpression(
  expression: ts.Expression,
): string | undefined {
  if (ts.isStringLiteral(expression)) {
    return expression.text;
  }

  if (ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }

  return undefined;
}

function referencesFromImportDeclaration(
  node: ts.ImportDeclaration,
): ModuleReference[] {
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
    return [];
  }

  const kind: DependencyEdgeKind = node.importClause?.isTypeOnly
    ? "type-import"
    : "import";

  return [{ specifier: node.moduleSpecifier.text, kind }];
}

function referencesFromExportDeclaration(
  node: ts.ExportDeclaration,
): ModuleReference[] {
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
    return [];
  }

  const kind: DependencyEdgeKind = node.isTypeOnly ? "type-import" : "re-export";

  return [{ specifier: node.moduleSpecifier.text, kind }];
}

function referencesFromImportEqualsDeclaration(
  node: ts.ImportEqualsDeclaration,
): ModuleReference[] {
  if (!ts.isExternalModuleReference(node.moduleReference)) {
    return [];
  }

  const specifier = stringLiteralFromExpression(node.moduleReference.expression);
  if (!specifier) {
    return [];
  }

  return [{ specifier, kind: "require" }];
}

function referencesFromCallExpression(
  node: ts.CallExpression,
): ModuleReference[] {
  const [firstArgument] = node.arguments;
  if (!firstArgument) {
    return [];
  }

  const specifier = stringLiteralFromExpression(firstArgument);
  if (!specifier) {
    return [];
  }

  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return [{ specifier, kind: "dynamic-import" }];
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
    return [{ specifier, kind: "require" }];
  }

  return [];
}

function visit(node: ts.Node): ModuleReference[] {
  if (ts.isImportDeclaration(node)) {
    return referencesFromImportDeclaration(node);
  }

  if (ts.isExportDeclaration(node)) {
    return referencesFromExportDeclaration(node);
  }

  if (ts.isImportEqualsDeclaration(node)) {
    return referencesFromImportEqualsDeclaration(node);
  }

  if (ts.isCallExpression(node)) {
    return referencesFromCallExpression(node);
  }

  return [];
}

export function extractModuleReferences(sourceFile: ts.SourceFile): ModuleReference[] {
  const references: ModuleReference[] = [];

  const collect = (node: ts.Node) => {
    references.push(...visit(node));
    ts.forEachChild(node, collect);
  };

  collect(sourceFile);
  return references;
}

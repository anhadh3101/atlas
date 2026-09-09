export interface DependencyNode {
  id: string;
}

export type DependencyEdgeKind =
  | "import"
  | "type-import"
  | "dynamic-import"
  | "re-export"
  | "require";

export interface DependencyEdge {
  source: string;
  target: string;
  specifier: string;
  kind: DependencyEdgeKind;
}

export interface UnresolvedDependency {
  source: string;
  specifier: string;
}

export interface TypeScriptDependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  unresolved: UnresolvedDependency[];
}

export interface CreateGraphOptions {
  projectRoot: string;
  tsconfigPath?: string;
}

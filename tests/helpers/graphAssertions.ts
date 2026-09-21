import assert from "node:assert/strict";

interface DependencyEdge {
  source: string;
  target: string;
  specifier: string;
  kind: string;
}

interface DependencyNode {
  id: string;
}

interface UnresolvedDependency {
  source: string;
  specifier: string;
}

interface TypeScriptDependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  unresolved: UnresolvedDependency[];
}

function edgeKey(edge: DependencyEdge): string {
  return `${edge.source}|${edge.target}|${edge.specifier}|${edge.kind}`;
}

export function assertValidDependencyGraph(
  graph: TypeScriptDependencyGraph,
  projectLabel: string,
): void {
  assert.ok(
    graph.nodes.length > 0,
    `${projectLabel}: expected at least one node`,
  );
  assert.ok(
    graph.edges.length >= 0,
    `${projectLabel}: edges should be a non-negative count`,
  );
  assert.ok(
    Array.isArray(graph.unresolved),
    `${projectLabel}: unresolved should be an array`,
  );

  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    assert.ok(
      !node.id.includes("node_modules"),
      `${projectLabel}: node id must not include node_modules: ${node.id}`,
    );
    assert.ok(
      !node.id.endsWith(".d.ts"),
      `${projectLabel}: node id must not be a declaration file: ${node.id}`,
    );
  }

  for (const edge of graph.edges) {
    assert.ok(
      nodeIds.has(edge.source),
      `${projectLabel}: edge source missing from nodes: ${edge.source}`,
    );
    assert.ok(
      nodeIds.has(edge.target),
      `${projectLabel}: edge target missing from nodes: ${edge.target}`,
    );
  }

  const sortedNodeIds = [...nodeIds].sort();
  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    sortedNodeIds,
    `${projectLabel}: nodes must be sorted by id`,
  );

  const sortedEdges = [...graph.edges].sort((left, right) =>
    edgeKey(left).localeCompare(edgeKey(right)),
  );
  assert.deepEqual(graph.edges, sortedEdges, `${projectLabel}: edges must be sorted`);

  const sortedUnresolved = [...graph.unresolved].sort((left, right) =>
    `${left.source}|${left.specifier}`.localeCompare(
      `${right.source}|${right.specifier}`,
    ),
  );
  assert.deepEqual(
    graph.unresolved,
    sortedUnresolved,
    `${projectLabel}: unresolved must be sorted`,
  );
}

---
description: Build a dependency graph of this project with the atlas MCP tool
argument-hint: [project root path]
---

Call the `atlas` tool from the atlas MCP server to create a dependency graph.
Use `$ARGUMENTS` as `rootPath` if given; otherwise use the absolute path of the current working directory.
Then summarize the result (node, edge and unresolved counts).

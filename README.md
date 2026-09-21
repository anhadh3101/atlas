# Atlas

Builds a dependency graph of a TypeScript project, exposed as an MCP server.

## Run

```
npm install && npm run build
node dist/mcp/server.js   # stdio MCP server (also: `atlas-mcp` bin)
```

Register it in your MCP client as a stdio server running that command.

## Tool

`atlas` — inputs: `rootPath` (absolute), `language` (`typescript`), `tsconfigPath?`, `format` (`summary` | `json`).

## `/atlas` command

- MCP prompt `atlas` is served by the server (optional `rootPath` arg). Clients with MCP prompt support show it as a slash command (Claude Code: `/mcp__<server-name>__atlas`).
- `commands/atlas.md` is a plain `/atlas` command file for Claude Code; copy it to `.claude/commands/`. It assumes the tool is available as the `atlas` tool of the atlas MCP server.

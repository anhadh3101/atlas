# Atlas Setup (Claude Code)

Get the Atlas MCP server running locally and install the `/atlas` slash command in Claude Code.

## Prerequisites

- Node.js 18+
- Claude Code CLI (`claude`)

## 1. Build Atlas

From the `atlas/` directory:

```bash
npm install
npm run build
```

This compiles `src/` to `dist/`, including the stdio MCP server at `dist/mcp/server.js`.

Confirm it starts (it will hang waiting for stdio input — that's expected; press `Ctrl+C` to exit):

```bash
node dist/mcp/server.js
```

## 2. Register the MCP server with Claude Code

Point Claude Code at the built server using its **absolute path**. From inside the `atlas/` directory:

```bash
claude mcp add atlas -- node "$(pwd)/dist/mcp/server.js"
```

Scope options:

| Command | Scope |
|---|---|
| `claude mcp add atlas -- node "$(pwd)/dist/mcp/server.js"` | Local (this project only, default) |
| `claude mcp add atlas --scope project -- node "$(pwd)/dist/mcp/server.js"` | Project (shared via `.mcp.json`, commit it) |
| `claude mcp add atlas --scope user -- node "$(pwd)/dist/mcp/server.js"` | User (available in every project) |

Verify the server connected:

```bash
claude mcp get atlas
```

or inside a session, run `/mcp` and check that `atlas` shows `✔ Connected`.

> Alternative: `npm link` in `atlas/` to expose the `atlas-mcp` bin globally, then register with `claude mcp add atlas -- atlas-mcp` instead of the absolute path.

## 3. Install the `/atlas` slash command

The MCP server registers the `atlas` tool, but Claude Code only shows a bare `/atlas` command from a skill/command file — copy `commands/atlas.md` into a Claude Code commands directory:

```bash
# Project scope — available to anyone using this repo, commit it
mkdir -p .claude/commands
cp commands/atlas.md .claude/commands/atlas.md

# OR user scope — available to you across all projects
mkdir -p ~/.claude/commands
cp commands/atlas.md ~/.claude/commands/atlas.md
```

Restart Claude Code (or run `/reload-plugins` / start a new session) so it picks up the new command.

## 4. Verify

Inside a Claude Code session:

```text
/atlas
```

or with an explicit path:

```text
/atlas /path/to/some/project
```

Claude should call the `atlas` MCP tool and return node/edge/unresolved counts.

## Notes

- `commands/atlas.md` assumes the MCP server is registered under the name `atlas` (the `-- ` name in `claude mcp add`). If you registered it under a different name, the tool is still discoverable — Claude just needs to know which server to call; edit the command file's wording if you renamed it.
- The server also registers an MCP **prompt** named `atlas`. Clients with MCP prompt support (including Claude Code) can alternatively invoke it as `/mcp__atlas__atlas` without installing the command file — useful for a quick check, but the `commands/atlas.md` install above is what gives you the clean `/atlas` name.
- To update after pulling new changes: `npm run build`, then reconnect the server with `claude mcp get atlas` or `/mcp` → Reconnect. No need to re-run `claude mcp add`.

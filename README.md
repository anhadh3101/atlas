# Atlas

Atlas MCP server for PR-based code review workflows. The `atlas` tool lists files changed in a GitHub pull request using the Claude Code project directory.

## Run

```
npm install && npm run build
node dist/mcp/server.js   # stdio MCP server (also: `atlas-mcp` bin)
```

Register it in your MCP client as a stdio server running that command.

## Tool

`atlas` — inputs: `pullRequest` (number), `format?` (`summary` | `json`). Uses `CLAUDE_PROJECT_DIR` from the MCP client as the repository root and runs `gh pr view` there.

## `/atlas` command

- MCP prompt `atlas` is served by the server (`pullRequest` arg). Clients with MCP prompt support show it as a slash command (Claude Code: `/mcp__<server-name>__atlas`).
- `commands/atlas.md` is a plain `/atlas` command file for Claude Code; copy it to `.claude/commands/`. It guides a PR-based code review: discover the workspace's GitHub repository, list its open PRs for the user to select, clone the selected PR into an isolated checkout, then review and report findings.
- Requires [GitHub CLI](https://cli.github.com/) (`gh`) and must be run from a GitHub repository workspace.

#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { atlasTool } from "../tools/atlas.js";

const server = new McpServer({ name: "atlas", version: "1.0.0" });

server.registerTool(
  atlasTool.name,
  {
    description: atlasTool.description,
    inputSchema: atlasTool.inputSchema.shape,
  },
  async (args) => {
    const result = await atlasTool.execute(args);
    return {
      content: [{ type: "text" as const, text: result.content }],
      ...("isError" in result && result.isError ? { isError: true } : {}),
    };
  },
);

// Surfaces as a "/atlas" slash command in MCP clients that support prompts.
server.registerPrompt(
  "atlas",
  {
    description: "List changed files in a pull request using the atlas tool.",
    argsSchema: {
      pullRequest: z.coerce
        .number()
        .int()
        .positive()
        .describe("Pull request number"),
    },
  },
  ({ pullRequest }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Call the atlas tool with pullRequest ${pullRequest} to list the files changed in that PR, then summarize the result.`,
        },
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());

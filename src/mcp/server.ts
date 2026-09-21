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
    description: "Build a dependency graph of the current project with the atlas tool.",
    argsSchema: {
      rootPath: z.string().optional().describe("Project root; defaults to the current working directory"),
    },
  },
  ({ rootPath }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Call the atlas tool to create a dependency graph for ${
            rootPath ? `the project at ${rootPath}` : "the current working directory (use its absolute path as rootPath)"
          }, then summarize the result.`,
        },
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());

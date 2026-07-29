import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("example verification workflow", () => {
	it("runs the deterministic Petstore MCP fixtures instead of removed catalog scripts", () => {
		const workflow = readFileSync(
			resolve(repositoryRoot, ".github/workflows/verify.yml"),
			"utf8",
		);

		expect(workflow).toContain("npm run example:petstore:mcp:fixture");
		expect(workflow).toContain("npm run example:petstore:mcp-agent:fixture");
		expect(workflow).not.toMatch(
			/example:(?:typechain|policy|typemcp|bridge|petstore:agent:real:fixture)/,
		);
	});
});

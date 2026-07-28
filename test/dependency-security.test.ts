import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

type Lockfile = {
	readonly packages: Record<string, { readonly version?: string }>;
};

describe("production dependency security", () => {
	it("pins the examples application to the audited MCP SDK graph", () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
		) as {
			readonly overrides?: {
				readonly "@theorvane/type-mcp"?: {
					readonly "@modelcontextprotocol/sdk"?: string;
				};
			};
		};
		const lockfile = JSON.parse(
			readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"),
		) as Lockfile;

		expect(
			packageJson.overrides?.["@theorvane/type-mcp"]?.[
				"@modelcontextprotocol/sdk"
			],
		).toBe("1.30.0");
		expect(
			lockfile.packages["node_modules/@modelcontextprotocol/sdk"]?.version,
		).toBe("1.30.0");
		expect(lockfile.packages["node_modules/@hono/node-server"]?.version).toBe(
			"2.0.12",
		);
	});
});

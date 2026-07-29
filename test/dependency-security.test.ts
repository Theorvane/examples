import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

type Lockfile = {
	readonly packages: Record<string, { readonly version?: string }>;
};

describe("production dependency security", () => {
	it("uses the published TypeMCP remediation without a local override", () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
		) as {
			readonly dependencies?: {
				readonly "@theorvane/type-mcp"?: string;
			};
		};
		const lockfile = JSON.parse(
			readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"),
		) as Lockfile;

		expect(packageJson.dependencies?.["@theorvane/type-mcp"]).toBe("^0.2.2");
		expect(
			lockfile.packages["node_modules/@modelcontextprotocol/sdk"]?.version,
		).toBe("1.30.0");
		expect(lockfile.packages["node_modules/@hono/node-server"]?.version).toBe(
			"2.0.12",
		);
	});
});

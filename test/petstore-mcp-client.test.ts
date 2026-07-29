import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("Petstore MCP SDK client", () => {
	it("initializes, lists tools, and calls fixture data over loopback HTTP", () => {
		expect(runExample("example:petstore:mcp:fixture")).toMatchObject({
			discoveredTools: [
				"search_available_pets",
				"get_pet",
				"get_petstore_inventory",
			],
			available: [
				{ id: 1, name: "Milo", status: "available" },
				{ id: 2, name: "Nori", status: "available" },
			],
		});
	});
});

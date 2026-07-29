import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("TypeChain Petstore MCP agent", () => {
	it("uses an annotated facade to select and execute a Petstore MCP tool", () => {
		expect(runExample("example:petstore:mcp-agent:fixture")).toEqual({
			discoveredTools: [
				"search_available_pets",
				"get_pet",
				"get_petstore_inventory",
			],
			tool: "search_available_pets",
			toolCallId: "available-pets-call",
			result: [
				{ id: 1, name: "Milo", status: "available" },
				{ id: 2, name: "Nori", status: "available" },
			],
		});
	});
});

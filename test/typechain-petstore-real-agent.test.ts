import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("real TypeChain Swagger Petstore agent", () => {
	it("runs a LangChain agent loop that selects and executes the TypeMCP search tool", () => {
		expect(runExample("example:petstore:agent:real:fixture")).toEqual({
			tool: "search_available_pets",
			toolCallId: "available-pets-call",
			result: [
				{ id: 1, name: "Milo", status: "available" },
				{ id: 2, name: "Nori", status: "available" },
			],
		});
	});
});

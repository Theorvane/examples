import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("TypeChain Swagger Petstore agent-style flow", () => {
	it("invokes the TypeMCP-adapted read-only tool and summarizes its fixture data", () => {
		expect(runExample("example:petstore:agent:fixture")).toEqual({
			tool: "search_available_pets",
			pets: [
				{ id: 1, name: "Milo", status: "available" },
				{ id: 2, name: "Nori", status: "available" },
			],
			summary: "Available pets: Milo (#1), Nori (#2).",
		});
	});
});

import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("Swagger Petstore TypeMCP wrapper", () => {
	it("declares only read-only Petstore tools and returns fixture-backed data", () => {
		expect(runExample("example:petstore:typemcp:fixture")).toEqual({
			name: "swagger-petstore",
			tools: ["search_available_pets", "get_pet", "get_petstore_inventory"],
			available: [{ id: 1, name: "Milo", status: "available" }],
			pet: { id: 2, name: "Nori", status: "pending" },
			inventory: { available: 2, sold: 1 },
			compiled: true,
		});
	});
});

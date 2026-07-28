import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("TypeMCP to TypeChain bridge", () => {
	it("adapts a TypeMCP declaration to an in-process LangChain tool", () => {
		expect(runExample("example:bridge")).toEqual({
			name: "find_product",
			result: '{"id":"sku-1","name":"Notebook","inStock":true}',
		});
	});
});

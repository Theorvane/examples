import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("TypeChain tool definition", () => {
	it("records metadata and preserves a receiver-bound invocation", () => {
		expect(runExample("example:typechain")).toEqual({
			name: "find_product",
			result: { id: "sku-1", name: "Notebook", inStock: true },
		});
	});
});

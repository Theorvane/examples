import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("TypeMCP server definition", () => {
	it("records a tool declaration and compiles a server", () => {
		expect(runExample("example:typemcp")).toEqual({
			name: "catalog",
			tools: ["find_product"],
			compiled: true,
		});
	});
});

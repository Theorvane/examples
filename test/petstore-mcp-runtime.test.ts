import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("Petstore Streamable HTTP runtime", () => {
	it("binds only an ephemeral loopback MCP route", () => {
		expect(runExample("example:petstore:mcp:fixture")).toMatchObject({
			url: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/),
			unexpectedPathStatus: 404,
		});
	});
});

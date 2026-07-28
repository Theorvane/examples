import { describe, expect, it } from "vitest";

import { runExample } from "./run-example.js";

describe("TypeChain policy guard", () => {
	it("demonstrates an application-owned approval and audit decision", () => {
		expect(runExample("example:policy")).toEqual({
			auditEvents: ["approval=required;project=project-42"],
			result: { archived: true, projectId: "project-42" },
		});
	});
});

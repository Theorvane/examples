import { describe, expect, it, vi } from "vitest";

import { type FetchLike, PetstoreClient } from "../examples/petstore-client.js";

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("PetstoreClient", () => {
	it("requests available pets from the fixed Swagger Petstore endpoint", async () => {
		const fetch = vi.fn<FetchLike>().mockResolvedValue(
			jsonResponse([
				{
					id: 7,
					name: "Milo",
					photoUrls: [],
					status: "available",
				},
			]),
		);
		const client = new PetstoreClient({ fetch, timeoutMs: 1_000 });

		await expect(client.findAvailablePets()).resolves.toEqual([
			{ id: 7, name: "Milo", status: "available" },
		]);
		expect(fetch).toHaveBeenCalledWith(
			"https://petstore.swagger.io/v2/pet/findByStatus?status=available",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("normalizes one pet and inventory records", async () => {
		const fetch = vi
			.fn<FetchLike>()
			.mockResolvedValueOnce(
				jsonResponse({
					id: 12,
					category: { id: 1, name: "Dogs" },
					name: "Piper",
					photoUrls: ["https://example.test/piper.jpg"],
					status: "pending",
				}),
			)
			.mockResolvedValueOnce(jsonResponse({ available: 4, sold: 2 }));
		const client = new PetstoreClient({ fetch, timeoutMs: 1_000 });

		await expect(client.getPet(12)).resolves.toEqual({
			id: 12,
			name: "Piper",
			status: "pending",
			category: "Dogs",
		});
		await expect(client.getInventory()).resolves.toEqual({
			available: 4,
			sold: 2,
		});
	});

	it("skips malformed individual public-demo records while retaining valid Petstore data", async () => {
		const fetch = vi.fn<FetchLike>().mockResolvedValue(
			jsonResponse([
				{ id: "not-a-number", name: "broken", photoUrls: [] },
				{ id: 7, name: "Milo", photoUrls: [], status: "available" },
			]),
		);

		await expect(
			new PetstoreClient({ fetch, timeoutMs: 1_000 }).findAvailablePets(),
		).resolves.toEqual([{ id: 7, name: "Milo", status: "available" }]);
	});

	it("rejects malformed API data and non-success responses", async () => {
		const malformedFetch = vi
			.fn<FetchLike>()
			.mockResolvedValue(jsonResponse({ id: 1 }));
		const unavailableFetch = vi
			.fn<FetchLike>()
			.mockResolvedValue(jsonResponse({ message: "gone" }, 404));

		await expect(
			new PetstoreClient({
				fetch: malformedFetch,
				timeoutMs: 1_000,
			}).findAvailablePets(),
		).rejects.toThrow(
			"Swagger Petstore returned an invalid available-pet payload",
		);
		await expect(
			new PetstoreClient({
				fetch: unavailableFetch,
				timeoutMs: 1_000,
			}).getInventory(),
		).rejects.toThrow(
			"Swagger Petstore GET /store/inventory failed with HTTP 404",
		);
	});

	it("rejects non-positive pet IDs and timeout values before requests", async () => {
		const fetch = vi.fn<FetchLike>();

		expect(() => new PetstoreClient({ fetch, timeoutMs: 0 })).toThrow(
			"timeoutMs must be a positive finite number",
		);
		await expect(
			new PetstoreClient({ fetch, timeoutMs: 1_000 }).getPet(0),
		).rejects.toThrow("petId must be a positive integer");
		expect(fetch).not.toHaveBeenCalled();
	});
});

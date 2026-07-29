import { type FetchLike, PetstoreClient } from "./petstore-client.js";
import { PetstoreServer } from "./typemcp-petstore-server.js";

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

export function createFixturePetstoreServer(): PetstoreServer {
	let calls = 0;
	const fetch: FetchLike = async () => {
		calls += 1;
		switch (calls) {
			case 1:
				return jsonResponse([
					{ id: 1, name: "Milo", photoUrls: [], status: "available" },
					{ id: 2, name: "Nori", photoUrls: [], status: "available" },
				]);
			case 2:
				return jsonResponse({
					id: 2,
					name: "Nori",
					photoUrls: [],
					status: "pending",
				});
			case 3:
				return jsonResponse({ available: 2, sold: 1 });
			default:
				throw new Error(`Unexpected fixture request ${calls}`);
		}
	};
	return PetstoreServer.withClient(
		new PetstoreClient({ fetch, timeoutMs: 1_000 }),
	);
}

import { createFixturePetstoreServer } from "./petstore-fixture.js";
import { connectPetstoreMcpClient } from "./petstore-mcp-client.js";
import { startPetstoreMcpRuntime } from "./petstore-mcp-runtime.js";

export async function run(): Promise<void> {
	const runtime = await startPetstoreMcpRuntime({
		serverFactory: createFixturePetstoreServer,
	});
	try {
		const unexpectedPathStatus = (await fetch(new URL("/not-mcp", runtime.url)))
			.status;
		const client = await connectPetstoreMcpClient(runtime.url);
		try {
			const discoveredTools = (await client.listTools()).map(
				(tool) => tool.name,
			);
			const available = await client.callTool("search_available_pets", {
				limit: 2,
			});
			console.log(
				JSON.stringify(
					{
						url: runtime.url.toString(),
						unexpectedPathStatus,
						discoveredTools,
						available,
					},
					null,
					2,
				),
			);
		} finally {
			await client.close();
		}
	} finally {
		await runtime.close();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

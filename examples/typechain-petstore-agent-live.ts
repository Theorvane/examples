import { summarizeAvailablePets } from "./typechain-petstore-agent.js";
import { PetstoreServer } from "./typemcp-petstore-server.js";

export async function run(): Promise<void> {
	const result = await summarizeAvailablePets(new PetstoreServer(), 3);
	console.log(
		JSON.stringify(
			{
				source: "https://petstore.swagger.io/v2",
				readOnly: true,
				...result,
				note: "This deterministic workflow invokes a TypeMCP-derived TypeChain tool; it does not configure an LLM or MCP transport.",
			},
			null,
			2,
		),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

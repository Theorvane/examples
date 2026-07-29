import { createFixturePetstoreServer } from "./petstore-fixture.js";
import {
	compilePetstoreServer,
	describePetstoreServer,
} from "./typemcp-petstore-server.js";

export async function run(): Promise<void> {
	const server = createFixturePetstoreServer();
	const definition = describePetstoreServer();
	const available = await server.searchAvailablePets({ limit: 1 });
	const pet = await server.getPet({ petId: 2 });
	const inventory = await server.getPetstoreInventory({});
	const compiled = await compilePetstoreServer();

	console.log(
		JSON.stringify(
			{
				name: definition.name,
				tools: definition.tools.map((tool) => tool.name),
				available,
				pet,
				inventory,
				compiled: Boolean(compiled),
			},
			null,
			2,
		),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

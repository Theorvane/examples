import { PetstoreServer } from "./typemcp-petstore-server.js";

export async function run(): Promise<void> {
	const server = new PetstoreServer();
	const available = await server.searchAvailablePets({ limit: 3 });
	const firstPet = available[0];
	const pet = firstPet
		? await server.getPet({ petId: firstPet.id })
		: undefined;
	const inventory = await server.getPetstoreInventory({});

	console.log(
		JSON.stringify(
			{
				source: "https://petstore.swagger.io/v2",
				readOnly: true,
				available,
				pet,
				inventory,
				note: "Swagger Petstore is a public demo API; live data can change between runs.",
			},
			null,
			2,
		),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

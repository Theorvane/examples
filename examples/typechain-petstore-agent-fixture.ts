import { createFixturePetstoreServer } from "./petstore-fixture.js";
import { summarizeAvailablePets } from "./typechain-petstore-agent.js";

export async function run(): Promise<void> {
	const summary = await summarizeAvailablePets(
		createFixturePetstoreServer(),
		2,
	);
	console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

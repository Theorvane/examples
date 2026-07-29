import {
	createMcpServer,
	getMcpServerDefinition,
	McpServer,
	McpTool,
} from "@theorvane/type-mcp";
import { z } from "zod";

import {
	createLivePetstoreClient,
	type PetstoreClient,
	type PetstorePet,
} from "./petstore-client.js";

const listInput = z.object({ limit: z.number().int().min(1).max(10) });
const petInput = z.object({ petId: z.number().int().positive() });
const emptyInput = z.object({});

const clients = new WeakMap<PetstoreServer, PetstoreClient>();

function clientFor(server: PetstoreServer): PetstoreClient {
	const client = clients.get(server);
	if (client) {
		return client;
	}
	const liveClient = createLivePetstoreClient();
	clients.set(server, liveClient);
	return liveClient;
}

@McpServer({ name: "swagger-petstore", version: "1.0.0" })
export class PetstoreServer {
	public static withClient(client: PetstoreClient): PetstoreServer {
		const server = new PetstoreServer();
		clients.set(server, client);
		return server;
	}

	@McpTool({
		name: "search_available_pets",
		description:
			"Read currently available pets from the public Swagger Petstore demo API.",
		input: listInput,
	})
	public searchAvailablePets(
		input: z.infer<typeof listInput>,
	): Promise<readonly PetstorePet[]> {
		return clientFor(this)
			.findAvailablePets()
			.then((pets) => pets.slice(0, input.limit));
	}

	@McpTool({
		name: "get_pet",
		description:
			"Read one pet by its positive numeric ID from the public Swagger Petstore demo API.",
		input: petInput,
	})
	public getPet(input: z.infer<typeof petInput>): Promise<PetstorePet> {
		return clientFor(this).getPet(input.petId);
	}

	@McpTool({
		name: "get_petstore_inventory",
		description: "Read the public Swagger Petstore inventory status counts.",
		input: emptyInput,
	})
	public getPetstoreInventory(
		_input: z.infer<typeof emptyInput>,
	): Promise<Readonly<Record<string, number>>> {
		return clientFor(this).getInventory();
	}
}

export function describePetstoreServer() {
	const definition = getMcpServerDefinition(PetstoreServer);
	if (!definition) {
		throw new Error(
			"Expected a decorated Swagger Petstore MCP server definition.",
		);
	}
	return definition;
}

export async function compilePetstoreServer() {
	return createMcpServer(PetstoreServer);
}

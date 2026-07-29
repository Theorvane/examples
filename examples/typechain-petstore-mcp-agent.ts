import { Tool } from "@theorvane/type-chain";
import { Agent, buildAgent } from "@theorvane/type-chain/agent";
import { z } from "zod";

import type { PetstoreMcpClient } from "./petstore-mcp-client.js";

const listInput = z.object({ limit: z.number().int().min(1).max(10) });
const petInput = z.object({ petId: z.number().int().positive() });
const emptyInput = z.object({});

@Agent({
	systemPrompt: "Use the Petstore MCP tools for factual Petstore questions.",
})
export class PetstoreMcpAgentTools {
	public constructor(private readonly client: PetstoreMcpClient) {}

	@Tool({
		name: "search_available_pets",
		description:
			"Read currently available pets through the connected MCP server.",
		schema: listInput,
	})
	public searchAvailablePets(
		input: z.infer<typeof listInput>,
	): Promise<unknown> {
		return this.client.callTool("search_available_pets", input);
	}

	@Tool({
		name: "get_pet",
		description: "Read a pet by numeric ID through the connected MCP server.",
		schema: petInput,
	})
	public getPet(input: z.infer<typeof petInput>): Promise<unknown> {
		return this.client.callTool("get_pet", input);
	}

	@Tool({
		name: "get_petstore_inventory",
		description: "Read Petstore inventory through the connected MCP server.",
		schema: emptyInput,
	})
	public getPetstoreInventory(
		input: z.infer<typeof emptyInput>,
	): Promise<unknown> {
		return this.client.callTool("get_petstore_inventory", input);
	}
}

export type BuildPetstoreMcpAgentOptions = Readonly<{
	model: Parameters<typeof buildAgent>[1]["model"];
	client: PetstoreMcpClient;
}>;

/** Builds a TypeChain @Agent whose tools delegate only to an MCP SDK client. */
export function buildPetstoreMcpAgent({
	model,
	client,
}: BuildPetstoreMcpAgentOptions) {
	return buildAgent(new PetstoreMcpAgentTools(client), { model });
}

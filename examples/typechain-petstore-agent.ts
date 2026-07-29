import { createTypeMcpLangChainTools } from "@theorvane/type-chain/typemcp";
import { z } from "zod";

import type { PetstorePet } from "./petstore-client.js";
import { PetstoreServer } from "./typemcp-petstore-server.js";

const adaptedPetSchema = z.object({
	id: z.number().int().nonnegative(),
	name: z.string(),
	status: z.string().optional(),
	category: z.string().optional(),
});

export type PetstoreAgentSummary = Readonly<{
	tool: "search_available_pets";
	pets: readonly PetstorePet[];
	summary: string;
}>;

/**
 * A deterministic agent-style workflow: it selects and invokes a TypeMCP tool
 * after TypeChain adapts it to LangChain's tool interface. No model provider
 * or MCP transport is created here.
 */
export async function summarizeAvailablePets(
	server: PetstoreServer,
	limit = 3,
): Promise<PetstoreAgentSummary> {
	const tools = await createTypeMcpLangChainTools(PetstoreServer, {
		resolver: { resolve: () => server },
	});
	const search = tools.find((tool) => tool.name === "search_available_pets");
	if (!search) {
		throw new Error(
			"TypeChain did not adapt the search_available_pets MCP tool",
		);
	}

	const rawResult = await search.invoke({ limit });
	if (typeof rawResult !== "string") {
		throw new Error(
			"TypeChain returned an unexpected non-text Petstore tool result",
		);
	}
	const parsed = z
		.array(adaptedPetSchema)
		.safeParse(JSON.parse(rawResult) as unknown);
	if (!parsed.success) {
		throw new Error("TypeChain returned an invalid Petstore tool result");
	}
	const pets: readonly PetstorePet[] = parsed.data.map((pet) => ({
		id: pet.id,
		name: pet.name,
		status: pet.status,
		...(pet.category === undefined ? {} : { category: pet.category }),
	}));
	const names = pets.map((pet) => `${pet.name} (#${pet.id})`).join(", ");

	return {
		tool: "search_available_pets",
		pets,
		summary:
			pets.length === 0
				? "No available pets were returned."
				: `Available pets: ${names}.`,
	};
}

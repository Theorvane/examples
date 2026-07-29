import { createTypeMcpAgent } from "@theorvane/type-chain/typemcp";

import { PetstoreServer } from "./typemcp-petstore-server.js";

type PetstoreAgentModel = Parameters<
	typeof createTypeMcpAgent<PetstoreServer>
>[0]["model"];

export type CreatePetstoreAgentOptions = Readonly<{
	/** The application selects, configures, and authenticates this LangChain model. */
	model: PetstoreAgentModel;
	/** Optional explicit Petstore resolver target; defaults to the live read-only server. */
	server?: PetstoreServer;
}>;

/**
 * Builds a real LangChain agent from the in-process TypeMCP Petstore tools.
 * It does not choose a model provider, read credentials, or start an MCP transport.
 */
export async function createPetstoreAgent({
	model,
	server,
}: CreatePetstoreAgentOptions) {
	const resolvedServer = server ?? new PetstoreServer();
	return createTypeMcpAgent({
		model,
		server: PetstoreServer,
		resolver: { resolve: () => resolvedServer },
	});
}

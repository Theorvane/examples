import { createMcpServer } from "@theorvane/type-mcp";
import { createMcpHandler } from "@theorvane/type-mcp/http";

import { PetstoreServer } from "./typemcp-petstore-server.js";

export type PetstoreMcpHandlerOptions = Readonly<{
	serverFactory: () => PetstoreServer;
}>;

/** Creates a session-safe Streamable HTTP handler for the read-only Petstore tools. */
export function createPetstoreMcpHandler({
	serverFactory,
}: PetstoreMcpHandlerOptions) {
	return createMcpHandler(async () => {
		const server = serverFactory();
		return createMcpServer(PetstoreServer, {
			resolve: () => server,
		});
	});
}

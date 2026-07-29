import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

import { createPetstoreMcpHandler } from "./petstore-mcp-handler.js";
import type { PetstoreServer } from "./typemcp-petstore-server.js";

export type PetstoreMcpRuntime = Readonly<{
	url: URL;
	close(): Promise<void>;
}>;

export type StartPetstoreMcpRuntimeOptions = Readonly<{
	serverFactory: () => PetstoreServer;
}>;

/** Hosts the Petstore MCP handler only on an ephemeral local loopback address. */
export async function startPetstoreMcpRuntime({
	serverFactory,
}: StartPetstoreMcpRuntimeOptions): Promise<PetstoreMcpRuntime> {
	const handler = createPetstoreMcpHandler({ serverFactory });
	const nodeServer = createServer(async (request, response) => {
		try {
			const url = new URL(request.url ?? "/", "http://127.0.0.1");
			if (url.pathname !== "/mcp") {
				response.writeHead(404).end();
				return;
			}
			await writeFetchResponse(
				response,
				await handler(await toFetchRequest(request)),
			);
		} catch (error) {
			response.writeHead(500, { "content-type": "application/json" }).end(
				JSON.stringify({
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);
		}
	});

	await new Promise<void>((resolve, reject) => {
		nodeServer.once("error", reject);
		nodeServer.listen({ host: "127.0.0.1", port: 0 }, () => {
			nodeServer.off("error", reject);
			resolve();
		});
	});
	const address = nodeServer.address();
	if (address === null || typeof address === "string") {
		await closeServer(nodeServer);
		throw new Error("Expected the Petstore MCP runtime to bind a TCP address");
	}
	const port = (address as AddressInfo).port;
	let closed = false;

	return {
		url: new URL(`http://127.0.0.1:${port}/mcp`),
		close: async () => {
			if (closed) {
				return;
			}
			closed = true;
			await closeServer(nodeServer);
		},
	};
}

async function toFetchRequest(request: IncomingMessage): Promise<Request> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	const headers = new Headers();
	for (const [name, value] of Object.entries(request.headers)) {
		if (value !== undefined) {
			headers.set(name, Array.isArray(value) ? value.join(", ") : value);
		}
	}
	const method = request.method ?? "GET";
	const body =
		chunks.length === 0 || method === "GET" || method === "HEAD"
			? undefined
			: Buffer.concat(chunks);
	return new Request(`http://127.0.0.1${request.url ?? "/"}`, {
		method,
		headers,
		...(body === undefined ? {} : { body }),
	});
}

async function writeFetchResponse(
	response: ServerResponse,
	fetchResponse: Response,
): Promise<void> {
	const headers = Object.fromEntries(fetchResponse.headers.entries());
	response.writeHead(fetchResponse.status, headers);
	response.end(Buffer.from(await fetchResponse.arrayBuffer()));
}

function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => (error === undefined ? resolve() : reject(error)));
	});
}

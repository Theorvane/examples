import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

export const petstoreMcpToolNames = [
	"search_available_pets",
	"get_pet",
	"get_petstore_inventory",
] as const;

export type PetstoreMcpToolName = (typeof petstoreMcpToolNames)[number];

export type PetstoreMcpClient = Readonly<{
	listTools(): Promise<readonly { readonly name: string }[]>;
	callTool(
		name: PetstoreMcpToolName,
		args: Record<string, unknown>,
	): Promise<unknown>;
	close(): Promise<void>;
}>;

/** Connects an official MCP SDK client to a loopback Streamable HTTP endpoint. */
export async function connectPetstoreMcpClient(
	url: URL,
): Promise<PetstoreMcpClient> {
	const client = new Client({
		name: "petstore-example-client",
		version: "1.0.0",
	});
	const transport = new StreamableHTTPClientTransport(url);
	try {
		await client.connect(transport as Parameters<typeof client.connect>[0]);
	} catch (error) {
		await transport.close();
		throw error;
	}
	let closed = false;

	return {
		listTools: async () =>
			(await client.listTools()).tools.map(({ name }) => ({ name })),
		callTool: async (name, args) => {
			const result = await client.callTool(
				{ name, arguments: args },
				CallToolResultSchema,
			);
			const parsed = CallToolResultSchema.safeParse(result);
			if (!parsed.success) {
				throw new Error(`MCP tool ${name} returned an invalid protocol result`);
			}
			if (parsed.data.isError === true) {
				throw new Error(`MCP tool ${name} returned an error`);
			}
			const content = parsed.data.content[0];
			if (content === undefined || content.type !== "text") {
				throw new Error(`MCP tool ${name} returned no text result`);
			}
			try {
				return JSON.parse(content.text) as unknown;
			} catch {
				throw new Error(`MCP tool ${name} returned invalid JSON text`);
			}
		},
		close: async () => {
			if (closed) {
				return;
			}
			closed = true;
			if (transport.sessionId !== undefined) {
				try {
					await transport.terminateSession();
				} catch {
					// The endpoint may decline DELETE; local transport shutdown still follows.
				}
			}
			await transport.close();
		},
	};
}

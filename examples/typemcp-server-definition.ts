import {
	createMcpServer,
	getMcpServerDefinition,
	McpServer,
	McpTool,
} from "@theorvane/type-mcp";
import { z } from "zod";

@McpServer({ name: "catalog", version: "1.0.0" })
export class CatalogServer {
	@McpTool({
		name: "find_product",
		description: "Find a product in the local catalog.",
		input: z.object({ id: z.string().min(1) }),
	})
	public findProduct(input: { readonly id: string }) {
		return { id: input.id, name: "Notebook", inStock: true };
	}
}

export function describeCatalogServer() {
	const definition = getMcpServerDefinition(CatalogServer);
	if (!definition) {
		throw new Error("Expected a decorated MCP server definition.");
	}
	return definition;
}

export async function compileCatalogServer() {
	return createMcpServer(CatalogServer);
}

export async function run(): Promise<void> {
	const definition = describeCatalogServer();
	const server = await compileCatalogServer();
	console.log(
		JSON.stringify(
			{
				name: definition.name,
				tools: definition.tools.map((tool) => tool.name),
				compiled: Boolean(server),
			},
			null,
			2,
		),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

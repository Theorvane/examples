import { createTypeMcpLangChainTools } from "@theorvane/type-chain/typemcp";

import { CatalogServer } from "./typemcp-server-definition.js";

export async function run(): Promise<void> {
	const tools = await createTypeMcpLangChainTools(CatalogServer, {
		resolver: { resolve: () => new CatalogServer() },
	});
	const [findProduct] = tools;
	if (!findProduct) {
		throw new Error("Expected the TypeMCP catalog tool to be adapted.");
	}

	const result = await findProduct.invoke({ id: "sku-1" });
	console.log(JSON.stringify({ name: findProduct.name, result }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

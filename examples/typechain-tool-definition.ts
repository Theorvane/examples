import { getToolDefinitions, Tool } from "@theorvane/type-chain";
import { z } from "zod";

const catalog = new Map([
	["sku-1", { id: "sku-1", name: "Notebook", inStock: true }],
	["sku-2", { id: "sku-2", name: "Mechanical keyboard", inStock: false }],
]);

export class CatalogTools {
	@Tool({
		name: "find_product",
		description: "Find a catalog product by its identifier.",
		schema: z.object({ id: z.string().min(1) }),
	})
	public findProduct(input: { readonly id: string }) {
		return catalog.get(input.id) ?? null;
	}
}

export function getCatalogTool() {
	const [tool] = getToolDefinitions(new CatalogTools());
	if (!tool) {
		throw new Error("Expected one decorated catalog tool.");
	}
	return tool;
}

export function run(): void {
	const tool = getCatalogTool();
	console.log(
		JSON.stringify(
			{ name: tool.name, result: tool.invoke({ id: "sku-1" }) },
			null,
			2,
		),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	run();
}

import { ToolMessage } from "@langchain/core/messages";
import { FakeToolCallingModel } from "langchain";
import { createFixturePetstoreServer } from "./petstore-fixture.js";
import { connectPetstoreMcpClient } from "./petstore-mcp-client.js";
import { startPetstoreMcpRuntime } from "./petstore-mcp-runtime.js";
import { buildPetstoreMcpAgent } from "./typechain-petstore-mcp-agent.js";

export async function run(): Promise<void> {
	const runtime = await startPetstoreMcpRuntime({
		serverFactory: createFixturePetstoreServer,
	});
	try {
		const client = await connectPetstoreMcpClient(runtime.url);
		try {
			const discoveredTools = (await client.listTools()).map(
				(tool) => tool.name,
			);
			const agent = buildPetstoreMcpAgent({
				model: new FakeToolCallingModel({
					toolCalls: [
						[
							{
								id: "available-pets-call",
								name: "search_available_pets",
								args: { limit: 2 },
							},
						],
						[],
					],
				}),
				client,
			});
			const result = await agent.invoke({
				messages: [
					{
						role: "user",
						content: "Which pets are currently available?",
					},
				],
			});
			const toolMessage = result.messages.find(ToolMessage.isInstance);
			if (!toolMessage || typeof toolMessage.content !== "string") {
				throw new Error("Expected the TypeChain agent to execute an MCP tool.");
			}
			console.log(
				JSON.stringify(
					{
						discoveredTools,
						tool: "search_available_pets",
						toolCallId: toolMessage.tool_call_id,
						result: JSON.parse(toolMessage.content) as unknown,
					},
					null,
					2,
				),
			);
		} finally {
			await client.close();
		}
	} finally {
		await runtime.close();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

import { ToolMessage } from "@langchain/core/messages";
import { FakeToolCallingModel } from "langchain";

import { createFixturePetstoreServer } from "./petstore-fixture.js";
import { createPetstoreAgent } from "./typechain-petstore-real-agent.js";

export async function run(): Promise<void> {
	const agent = await createPetstoreAgent({
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
		server: createFixturePetstoreServer(),
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
	if (!toolMessage) {
		throw new Error("Expected the LangChain agent to execute a Petstore tool.");
	}

	console.log(
		JSON.stringify(
			{
				tool: "search_available_pets",
				toolCallId: toolMessage.tool_call_id,
				result: JSON.parse(toolMessage.content as string) as unknown,
			},
			null,
			2,
		),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

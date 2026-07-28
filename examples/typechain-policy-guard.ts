import { Policy, Tool, withToolPolicyGuard } from "@theorvane/type-chain";
import { z } from "zod";

export class ArchiveTools {
	@Policy({ approval: "required", audit: "required" })
	@Tool({
		name: "archive_project",
		description:
			"Archive a project after an application-owned approval decision.",
		schema: z.object({ projectId: z.string().min(1), approved: z.boolean() }),
	})
	public archiveProject(input: {
		readonly projectId: string;
		readonly approved: boolean;
	}) {
		return { archived: true, projectId: input.projectId };
	}
}

export async function run(): Promise<void> {
	const auditEvents: string[] = [];
	const [archive] = withToolPolicyGuard(
		new ArchiveTools(),
		({ input, policy }) => {
			const request = input as {
				readonly projectId: string;
				readonly approved: boolean;
			};
			auditEvents.push(
				`approval=${policy.approval};project=${request.projectId}`,
			);
			if (!request.approved) {
				throw new Error(
					"The application did not approve this archive request.",
				);
			}
		},
	);

	if (!archive) {
		throw new Error("Expected one guarded archive tool.");
	}

	console.log(
		JSON.stringify(
			{
				auditEvents,
				result: await archive.invoke({
					projectId: "project-42",
					approved: true,
				}),
			},
			null,
			2,
		),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}

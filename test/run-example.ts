import { execFileSync } from "node:child_process";

export function runExample(script: string): unknown {
	const output = execFileSync("npm", ["run", script, "--silent"], {
		cwd: new URL("..", import.meta.url),
		encoding: "utf8",
	});
	return JSON.parse(output) as unknown;
}

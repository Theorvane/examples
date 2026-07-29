# Petstore Real MCP Agent Implementation Plan

> **For Hermes:** Implement this plan task-by-task with test-first slices. Preserve the issue-first `dev` → release-only `main` workflow.

**Goal:** Replace the mixed example catalog with one read-only Swagger Petstore flow in which a TypeMCP Streamable HTTP server is consumed by an MCP SDK client and a TypeChain `@Agent()` / `buildAgent()` runtime.

**Architecture:** `PetstoreClient` remains the sole REST boundary and uses fixed-host GET requests. `PetstoreServer` exposes its three tools with TypeMCP, and a Node loopback runtime hosts TypeMCP's official Fetch Streamable HTTP handler at an ephemeral `127.0.0.1` `/mcp` URL. An MCP SDK `Client` plus `StreamableHTTPClientTransport` owns protocol initialization/discovery/tool calls. `PetstoreMcpAgentTools` is a TypeChain `@Agent()` class whose explicit-schema `@Tool()` methods delegate only to that MCP client; `buildAgent()` constructs the LangChain loop from the caller-provided model.

**Tech Stack:** TypeScript (NodeNext), Zod, `@theorvane/type-mcp@^0.2.2`, `@theorvane/type-chain@^0.1.1`, `@modelcontextprotocol/sdk@1.30.0` transitive dependency, Node `http`, LangChain `FakeToolCallingModel`, Vitest, Biome.

---

## Ground rules

- Work from `origin/dev` on an English issue-scoped branch, never directly on `dev` or `main`.
- Never add a Petstore write method, credential/API key, host override, provider SDK, `process.env` lookup, public listener, live LLM command, or external network dependency to tests.
- Bind the local MCP runtime to literal host `127.0.0.1` and port `0`; test cleanup must close client transport/session before the HTTP runtime.
- Do not claim TypeChain implements an MCP client. The example owns the SDK client integration, while TypeChain owns annotated façade-tool adaptation and agent construction.
- Retain only Petstore-centered examples after the cleanup task.

## Task 1: Define the MCP client and loopback runtime contracts

**Objective:** Add focused tests that specify a real Streamable HTTP MCP lifecycle before introducing runtime code.

**Files:**
- Create: `test/petstore-mcp-runtime.test.ts`
- Create: `test/petstore-mcp-client.test.ts`
- Create: `examples/petstore-mcp-runtime.ts`
- Create: `examples/petstore-mcp-client.ts`
- Modify: `examples/petstore-fixture.ts`

**Step 1: Write a failing loopback runtime test**

Use `createFixturePetstoreServer()` and import a non-existent `startPetstoreMcpRuntime()`. Assert that it yields an `http://127.0.0.1:<port>/mcp` URL and that a request to any non-`/mcp` path returns 404. Use `try/finally` to await `runtime.close()`.

```ts
const runtime = await startPetstoreMcpRuntime({
  serverFactory: createFixturePetstoreServer,
});
try {
  expect(runtime.url.hostname).toBe("127.0.0.1");
  expect(runtime.url.pathname).toBe("/mcp");
  expect((await fetch(new URL("/not-mcp", runtime.url))).status).toBe(404);
} finally {
  await runtime.close();
}
```

**Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test -- --run test/petstore-mcp-runtime.test.ts
```

Expected: TypeScript/module failure because `examples/petstore-mcp-runtime.ts` does not exist.

**Step 3: Write a failing official-client test**

Import non-existent `connectPetstoreMcpClient()`. Start the fixture runtime, connect the SDK-backed client, and assert that `listTools()` returns exactly the three expected names. Then call `search_available_pets` with `{ limit: 2 }` and assert the MCP result represents fixture pets Milo and Nori. Close the client then runtime in nested `finally` blocks.

```ts
const client = await connectPetstoreMcpClient(runtime.url);
try {
  expect((await client.listTools()).map((tool) => tool.name)).toEqual([
    "search_available_pets",
    "get_pet",
    "get_petstore_inventory",
  ]);
  expect(await client.callTool("search_available_pets", { limit: 2 }))
    .toEqual([
      { id: 1, name: "Milo", status: "available" },
      { id: 2, name: "Nori", status: "available" },
    ]);
} finally {
  await client.close();
}
```

**Step 4: Run the focused test and confirm RED**

Run:

```bash
npm test -- --run test/petstore-mcp-client.test.ts
```

Expected: module failure for the absent client wrapper.

**Step 5: Commit the test-only slice**

```bash
git add test/petstore-mcp-runtime.test.ts test/petstore-mcp-client.test.ts
git commit -m "test: specify Petstore MCP HTTP lifecycle"
```

## Task 2: Compile Petstore TypeMCP tools into a session-safe HTTP handler

**Objective:** Implement a factory that compiles a fresh TypeMCP server per Streamable HTTP session without direct client-side access to Petstore classes.

**Files:**
- Modify: `examples/typemcp-petstore-server.ts`
- Create: `examples/petstore-mcp-handler.ts`
- Test: `test/petstore-mcp-client.test.ts`

**Step 1: Implement `createPetstoreMcpHandler()`**

Export a handler factory accepting a `serverFactory: () => PetstoreServer`. It must use only published TypeMCP APIs:

```ts
import { createMcpServer } from "@theorvane/type-mcp";
import { createMcpHandler } from "@theorvane/type-mcp/http";

export function createPetstoreMcpHandler(options: {
  readonly serverFactory: () => PetstoreServer;
}) {
  return createMcpHandler(() => {
    const server = options.serverFactory();
    return createMcpServer(PetstoreServer, {
      resolver: { resolve: () => server },
    });
  });
}
```

Do not create an MCP server globally: each Streamable HTTP session needs its own compiled server and deterministic fixture call sequence.

**Step 2: Run the client test and confirm it still fails**

Run:

```bash
npm test -- --run test/petstore-mcp-client.test.ts
```

Expected: failure remains because the runtime/client wrappers are absent.

**Step 3: Add a focused compile regression assertion**

In `test/typemcp-petstore-server.test.ts`, retain the three-tool declaration assertion but change it from subprocess-only verification to direct definition metadata where possible. Verify exact names and no tool name other than the three read-only operations.

**Step 4: Run TypeMCP tests**

Run:

```bash
npm test -- --run test/typemcp-petstore-server.test.ts
```

Expected: PASS.

**Step 5: Commit the handler slice**

```bash
git add examples/petstore-mcp-handler.ts examples/typemcp-petstore-server.ts test/typemcp-petstore-server.test.ts
git commit -m "feat: compile Petstore TypeMCP HTTP handler"
```

## Task 3: Implement the loopback Streamable HTTP runtime

**Objective:** Host the Fetch handler on an ephemeral local-only Node HTTP server with deterministic shutdown.

**Files:**
- Create: `examples/petstore-mcp-runtime.ts`
- Test: `test/petstore-mcp-runtime.test.ts`

**Step 1: Implement the Node request adapter**

Use `node:http` and convert each incoming request into a Web `Request`, preserving request method, headers, and body only when allowed. Convert the `Response` returned from the Fetch handler back to `ServerResponse`, including headers/body/status. Keep the adapter local to this file; do not add an HTTP framework.

**Step 2: Implement the runtime factory**

```ts
export type PetstoreMcpRuntime = Readonly<{
  url: URL;
  close(): Promise<void>;
}>;

export async function startPetstoreMcpRuntime(options: {
  readonly serverFactory: () => PetstoreServer;
}): Promise<PetstoreMcpRuntime>
```

- Build `createPetstoreMcpHandler({ serverFactory })` once for the local runtime.
- Route only `/mcp`; answer 404 for every other pathname.
- Call `nodeServer.listen({ host: "127.0.0.1", port: 0 })` and read the assigned port from `nodeServer.address()`.
- Return URL `http://127.0.0.1:<port>/mcp`.
- Make `close()` idempotent and resolve after `nodeServer.close()`.

**Step 3: Run the runtime test and confirm GREEN**

Run:

```bash
npm test -- --run test/petstore-mcp-runtime.test.ts
```

Expected: PASS; no process remains listening after the test.

**Step 4: Run formatting/type checking**

```bash
npm run format
npm run lint
npm run build
```

Expected: all PASS.

**Step 5: Commit the runtime slice**

```bash
git add examples/petstore-mcp-runtime.ts test/petstore-mcp-runtime.test.ts
git commit -m "feat: host Petstore MCP on loopback HTTP"
```

## Task 4: Implement the official MCP SDK client wrapper

**Objective:** Make protocol initialization, discovery, calls, and close explicit at the application boundary.

**Files:**
- Create: `examples/petstore-mcp-client.ts`
- Test: `test/petstore-mcp-client.test.ts`

**Step 1: Implement connection using official SDK classes**

Import direct installed SDK paths:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
```

Create `new Client({ name: "petstore-example-client", version: "1.0.0" })`, create `new StreamableHTTPClientTransport(url)`, and call `client.connect(transport)`. `connect()` performs MCP initialization automatically. If it fails, close the transport before rethrowing.

**Step 2: Implement typed wrapper operations**

Expose:

```ts
export interface PetstoreMcpClient {
  listTools(): Promise<readonly { readonly name: string }[]>;
  callTool(name: PetstoreMcpToolName, args: Record<string, unknown>): Promise<unknown>;
  close(): Promise<void>;
}
```

- `listTools()` calls `client.listTools()` and returns tool descriptors.
- `callTool()` calls `client.callTool({ name, arguments: args })`.
- Parse only JSON-compatible text/structured result content needed by Petstore tools. Reject `isError` results, missing content, non-text/malformed JSON, and unexpected response shape with clear errors.
- `close()` calls `transport.terminateSession()` when a session exists, tolerates a server method-not-allowed response, and always calls `transport.close()` once. Do not invent reconnection/OAuth support.

**Step 3: Run the client test and confirm GREEN**

```bash
npm test -- --run test/petstore-mcp-client.test.ts
```

Expected: PASS and verifies real initialization, `tools/list`, and `tools/call` against the loopback TypeMCP handler.

**Step 4: Commit the client boundary**

```bash
git add examples/petstore-mcp-client.ts test/petstore-mcp-client.test.ts
git commit -m "feat: add Petstore MCP SDK client"
```

## Task 5: Build the TypeChain `@Agent()` MCP façade and agent E2E proof

**Objective:** Ensure the annotated TypeChain agent calls the MCP client—not in-process TypeMCP or REST APIs.

**Files:**
- Create: `examples/typechain-petstore-mcp-agent.ts`
- Create: `examples/typechain-petstore-mcp-agent-fixture.ts`
- Create: `test/typechain-petstore-mcp-agent.test.ts`
- Modify: `package.json`

**Step 1: Write the failing agent E2E test**

Use the fixture runner through `runExample("example:petstore:mcp-agent:fixture")`. Assert output includes:

```ts
{
  discoveredTools: [
    "search_available_pets",
    "get_pet",
    "get_petstore_inventory",
  ],
  tool: "search_available_pets",
  toolCallId: "available-pets-call",
  result: [
    { id: 1, name: "Milo", status: "available" },
    { id: 2, name: "Nori", status: "available" },
  ],
}
```

**Step 2: Run the test and confirm RED**

```bash
npm test -- --run test/typechain-petstore-mcp-agent.test.ts
```

Expected: npm script does not exist.

**Step 3: Implement the annotated façade**

Import `Agent`, `buildAgent`, and `Tool` from the published TypeChain subpaths. Define `PetstoreMcpAgentTools` with a connected `PetstoreMcpClient` constructor dependency.

```ts
@Agent({
  systemPrompt: "Use the Petstore MCP tools for factual Petstore questions.",
})
export class PetstoreMcpAgentTools {
  public constructor(private readonly client: PetstoreMcpClient) {}

  @Tool({
    name: "search_available_pets",
    description: "Read currently available pets through the connected MCP server.",
    input: z.object({ limit: z.number().int().min(1).max(10) }),
  })
  public searchAvailablePets(input: { limit: number }) {
    return this.client.callTool("search_available_pets", input);
  }
}
```

Add analogous explicit-schema façades for `get_pet` and `get_petstore_inventory`. None may import `PetstoreClient`, `PetstoreServer`, TypeMCP decorators, `createMcpServer`, or TypeMCP LangChain adapters.

Export:

```ts
export function buildPetstoreMcpAgent({ model, client }: {
  readonly model: Parameters<typeof buildAgent>[1]["model"];
  readonly client: PetstoreMcpClient;
}) {
  return buildAgent(new PetstoreMcpAgentTools(client), { model });
}
```

**Step 4: Implement the fixture runner**

- Start runtime with `createFixturePetstoreServer`.
- Connect `PetstoreMcpClient`.
- Get/serialize discovered tool names before invoking the agent.
- Construct `FakeToolCallingModel` with exactly one `search_available_pets({ limit: 2 })` call followed by an empty tool-call response.
- Invoke `buildPetstoreMcpAgent({ model, client })`.
- Find `ToolMessage`, parse content, print only the asserted JSON shape.
- Use nested `try/finally` to close client and runtime no matter what happens.

**Step 5: Add the runner script and confirm GREEN**

Add:

```json
"example:petstore:mcp-agent:fixture": "tsx examples/typechain-petstore-mcp-agent-fixture.ts"
```

Run:

```bash
npm run example:petstore:mcp-agent:fixture
npm test -- --run test/typechain-petstore-mcp-agent.test.ts
```

Expected: fixture JSON exactly contains `Milo`/`Nori`; test PASS.

**Step 6: Verify the façade boundary statically**

Add an assertion or a source-contract test showing `typechain-petstore-mcp-agent.ts` imports TypeChain agent/tool and local MCP client only, and does not import the REST client or TypeMCP runtime/adapter modules.

**Step 7: Commit agent proof**

```bash
git add examples/typechain-petstore-mcp-agent.ts examples/typechain-petstore-mcp-agent-fixture.ts test/typechain-petstore-mcp-agent.test.ts package.json
git commit -m "feat: add TypeChain MCP Petstore agent"
```

## Task 6: Remove superseded examples and rewrite documentation

**Objective:** Leave one coherent Petstore curriculum and truthful runtime boundaries.

**Files:**
- Delete: `examples/typechain-tool-definition.ts`
- Delete: `examples/typechain-policy-guard.ts`
- Delete: `examples/typemcp-server-definition.ts`
- Delete: `examples/typemcp-langchain-bridge.ts`
- Delete: `examples/typechain-petstore-agent.ts`
- Delete: `examples/typechain-petstore-agent-fixture.ts`
- Delete: `examples/typechain-petstore-agent-live.ts`
- Delete: `examples/typechain-petstore-real-agent.ts`
- Delete: `examples/typechain-petstore-real-agent-fixture.ts`
- Delete: `examples/typemcp-petstore-fixture.ts`
- Delete associated obsolete test files:
  - `test/typechain-tool-definition.test.ts`
  - `test/typechain-policy-guard.test.ts`
  - `test/typemcp-server-definition.test.ts`
  - `test/typemcp-langchain-bridge.test.ts`
  - `test/typechain-petstore-agent.test.ts`
  - `test/typechain-petstore-real-agent.test.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `test/dependency-security.test.ts`
- Modify: `docs/planning/2026-07-29-swagger-petstore-agent.md`
- Modify: `docs/planning/2026-07-29-real-typechain-petstore-agent.md`
- Modify: `docs/superpowers/specs/2026-07-29-petstore-real-mcp-agent-design.md`

**Step 1: Remove obsolete scripts and files**

Keep only these runnable scripts in addition to development commands:

```json
"example:petstore:live": "tsx examples/petstore-live.ts",
"example:petstore:mcp-agent:fixture": "tsx examples/typechain-petstore-mcp-agent-fixture.ts"
```

Update `petstore-live.ts` if needed so it remains a concise optional GET-only REST smoke example. It must not be described as a real MCP client/agent demonstration.

**Step 2: Rewrite README from scratch around one flow**

Include:

1. Architecture diagram: public Petstore GET → TypeMCP server → loopback HTTP MCP → SDK client → TypeChain `@Agent()` façade → LangChain agent.
2. One fixture command and the exact proof it provides (`initialize`, `tools/list`, `tools/call`, agent call).
3. One optional live REST command with public-demo variability warning.
4. Exact three tool names and GET-only fixed-host boundary.
5. Caller-owned model/provider/credentials rule.
6. Explicit statement that the loopback runtime has no production authorization, public hosting, durable sessions, deployment configuration, or live LLM configuration.

Do not call this an external/remote production MCP service; it is a local protocol E2E example.

**Step 3: Update historical planning docs**

Mark old in-process plans as superseded by the new spec and link to it. Do not erase historical facts or leave them appearing active.

**Step 4: Run full cleanup validation**

```bash
npm run format
npm run lint
npm run build
npm test
npm run audit:prod
npm run check
npm run example:petstore:mcp-agent:fixture
npm run example:petstore:live
git diff --check
```

Expected: format/lint/build/tests/audit all PASS; fixture command is deterministic; live REST command is manually smoke-tested and may fail only with a clearly reported public-service error.

**Step 5: Clean-install verification**

```bash
rm -rf /tmp/theorvane-examples-petstore-mcp-clean
cp -a . /tmp/theorvane-examples-petstore-mcp-clean
cd /tmp/theorvane-examples-petstore-mcp-clean
rm -rf node_modules
npm ci
npm run check
npm run example:petstore:mcp-agent:fixture
```

Expected: clean install passes with no uncommitted generated output.

**Step 6: Commit cleanup/documentation**

```bash
git add -A
git commit -m "refactor: center examples on Petstore MCP agent"
```

## Task 7: PR, independent review, and release promotion

**Objective:** Deliver the scoped rewrite through the protected branch workflow.

**Files:**
- GitHub issue: `Theorvane/examples#27`
- Feature branch: `feat/27-petstore-real-mcp-agent` created from current `origin/dev`
- PR: feature branch → `dev`
- Release issue/PR: current reviewed `dev` → `main`

**Step 1: Rebase/recreate implementation branch from current dev**

After design-doc approval, create `feat/27-petstore-real-mcp-agent` from the current `origin/dev`. Cherry-pick the spec/plan commits if the docs branch is separate; preserve the issue link.

**Step 2: Create the feature PR**

PR body must include:

- closes #27;
- fixed GET-only Petstore scope;
- test proof for MCP initialize/list/call and `@Agent()` façade path;
- deletion list for superseded in-process/catalog examples;
- no credential/provider/production hosting claims;
- full local and clean-install verification commands/results.

**Step 3: Verify exact PR head before review**

```bash
gh pr view <number> --repo Theorvane/examples --json headRefOid,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup
```

Require exact-head `verify`, no unresolved review threads, and independent review from `sjungwon03-ai`/the code-reviewer profile. Reviewers inspect GitHub source/diff/Actions/rules only; they do not run local commands.

**Step 4: Merge only after exact-head approval/checks**

Merge feature PR into `dev` according to the dev ruleset. Confirm the issue closes and capture the resulting `dev` head.

**Step 5: Preserve main ancestry when needed**

Before `dev → main`, require `git merge-base --is-ancestor origin/main origin/dev`. If false because a prior production promotion was squash-merged, create a separate two-parent reconciliation issue/PR that adds no product diff, get an exact-head review/check, and merge it into `dev` before release promotion.

**Step 6: Create release PR and repeat independent verification**

Create a fresh release issue and PR from current `dev` to `main`. Require exact source head, successful `verify` and `release-promotion`, independent fresh approval, resolved threads, and the repository-required merge method. Do not treat feature-PR approval as release approval.

**Step 7: Production verification and closure**

After merge, clone `main` cleanly and run:

```bash
npm ci
npm run check
npm run example:petstore:mcp-agent:fixture
```

Verify post-merge GitHub Actions success at canonical `main`, close the release issue, and ensure no open implementation/release PR remains.

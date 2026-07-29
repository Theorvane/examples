# Petstore Real MCP Agent Design

**Issue:** [#27](https://github.com/Theorvane/examples/issues/27)
**Status:** Proposed
**Decision:** Replace the mixed catalog and in-process-only Petstore examples with one deterministic, end-to-end Swagger Petstore scenario. TypeMCP exposes the Petstore tools through local Streamable HTTP; an MCP SDK client consumes that service; a TypeChain `@Agent()` class invokes the MCP client through `@Tool()` façades.

## Goal

Make the repository demonstrate a truthful, runnable path from a public read-only REST API to a real MCP client session and then to a TypeChain `@Agent()`-built LangChain agent.

The end-to-end test must prove this sequence:

```text
FakeToolCallingModel
  → LangChain agent built by TypeChain buildAgent()
  → @Agent() PetstoreMcpAgentTools
  → @Tool() MCP client façade
  → MCP SDK Streamable HTTP client session
  → loopback HTTP server (127.0.0.1, ephemeral port)
  → TypeMCP createMcpHandler() / createMcpServer()
  → @McpServer() / @McpTool() PetstoreServer
  → injected fixture PetstoreClient
```

A separate live command may use the public Swagger Petstore v2 endpoint, but deterministic tests and CI never depend on it.

## Scope

### Included

- One Petstore-only example structure.
- `PetstoreClient` fixed to `https://petstore.swagger.io/v2`, with only validated `GET` operations:
  - `findAvailablePets()`
  - `getPet(petId)`
  - `getInventory()`
- A TypeMCP `@McpServer()` / `@McpTool()` wrapper exposing exactly:
  - `search_available_pets`
  - `get_pet`
  - `get_petstore_inventory`
- A Fetch-compatible Streamable HTTP handler built with `createMcpHandler()` and `createMcpServer()`.
- A local runtime helper that binds a Node HTTP server only to `127.0.0.1` on port `0`, exposes an `/mcp` URL, and has an explicit asynchronous `close()` lifecycle.
- An MCP SDK client helper that connects to the loopback endpoint and exposes tool-list and tool-call operations.
- A TypeChain class decorated with `@Agent()` and `@Tool()`. Its tool methods only delegate to the MCP SDK client; they never call `PetstoreClient`, `PetstoreServer`, or TypeMCP adapters directly.
- Agent construction with `buildAgent()` and a caller-provided LangChain-compatible model.
- A fixture E2E runner/test that starts the loopback runtime, connects the MCP client, validates `tools/list`, then proves a `FakeToolCallingModel`-driven agent calls `search_available_pets` through MCP and returns fixture pets.
- README and focused planning/spec documentation covering the protocol boundary and lifecycle.

### Removed or replaced

- Generic catalog examples unrelated to Petstore:
  - TypeChain tool-definition example
  - TypeChain policy-guard example
  - TypeMCP server-definition example
  - TypeMCP-to-TypeChain in-process bridge example
- The current in-process TypeMCP adapter workflow and factory. Their tests, scripts, and README references are removed because they do not prove an MCP client/session boundary.

### Excluded

- Public write methods (create, update, delete), credentials, API keys, custom API hosts, or environment-configured Petstore behavior.
- External deployment, public listening interfaces, authentication, authorization, durable MCP session storage, retries, audit persistence, or observability infrastructure.
- stdio transport, an HTTP framework dependency, provider SDKs, live model credentials, and automated live LLM calls.
- A claim that TypeChain itself implements an MCP client. The MCP SDK client is an application integration dependency used by the example; TypeChain operates the annotated façade tools.

## Architecture

### Petstore API boundary

`PetstoreClient` remains the only component that performs public REST I/O. It owns fixed URL construction, GET method selection, timeout, HTTP failure handling, and Zod response normalization. It accepts injected `fetch` for fixtures.

### TypeMCP server boundary

`PetstoreServer` carries TypeMCP metadata and invokes its injected `PetstoreClient`. A handler factory compiles a fresh decorated server for each MCP session via:

```ts
createMcpHandler(() =>
  createMcpServer(PetstoreServer, {
    resolver: { resolve: () => petstoreServer },
  }),
);
```

The resolver must return a session-safe server instance. Tests use fixture-backed instances and live commands use a live client. The handler owns SDK protocol/session routing; the application runtime owns route hosting and shutdown.

### Loopback runtime boundary

`startPetstoreMcpRuntime()` creates a Node HTTP server whose request handler routes only `/mcp` to the Fetch handler. It listens on `127.0.0.1` and port `0`, returning:

```ts
type PetstoreMcpRuntime = {
  readonly url: URL;
  close(): Promise<void>;
};
```

The helper must reject other paths and must close the HTTP server on test cleanup. It does not expose a public deployment recipe.

### MCP client boundary

An SDK client wrapper receives the runtime URL, creates an official Streamable HTTP client transport, connects, and exposes typed `listTools()` and `callTool()` operations. It must provide `close()` so tests always end client sessions before stopping the runtime.

The wrapper must preserve JSON-compatible tool arguments/results and throw useful errors for protocol failures or malformed MCP tool content. It must not reach into TypeMCP metadata or call Petstore classes directly.

### TypeChain `@Agent()` boundary

`PetstoreMcpAgentTools` receives the connected MCP client wrapper. It is decorated with:

- `@Agent({ systemPrompt })` from `@theorvane/type-chain/agent`
- explicit-schema `@Tool()` methods from the TypeChain package

Each decorated method makes exactly one corresponding MCP `tools/call` request. `buildPetstoreMcpAgent({ model, client })` creates the runtime using:

```ts
buildAgent(new PetstoreMcpAgentTools(client), { model });
```

The model remains application-supplied. No provider, model identifier, credential, or environment lookup appears in the repository.

## Error handling and lifecycle

- Invalid REST response, HTTP error, or timeout propagates from `PetstoreClient` through the MCP tool result in a safe, actionable form.
- Failed MCP connection closes the partially allocated client transport.
- The runtime closes even if initialization, discovery, or agent invocation fails; tests use `try/finally`.
- The loopback helper refuses unexpected paths rather than accidentally serving a general HTTP surface.
- Tests use fixture fetch data and an ephemeral port, avoiding public API availability and port collisions.

## Test plan

1. Retain focused fixture tests for REST URL/method/validation behavior.
2. Test TypeMCP declaration names and read-only input schemas.
3. Test the loopback runtime using an official MCP client:
   - connection/initialization succeeds;
   - `tools/list` contains exactly the three declared tools;
   - `tools/call` invokes fixture data through the protocol.
4. Test the agent E2E path with `FakeToolCallingModel`:
   - model requests `search_available_pets`;
   - `@Tool()` façade invokes the connected MCP client;
   - the returned `ToolMessage` contains the fixture `Milo` and `Nori` records.
5. Test cleanup by closing the client and runtime; no persistent server process remains.
6. Run full `npm run check`, all fixture commands, `npm run audit:prod`, and `git diff --check`.

## Documentation contract

README will contain one architecture diagram, one fixture command, one optional live REST smoke command, and concise boundaries:

- fixture E2E validates a real local Streamable HTTP MCP session;
- the `@Agent()` façade uses the MCP client, not direct Petstore or TypeMCP calls;
- the live Petstore REST API is public mutable demo infrastructure;
- provider/model configuration and credentials are application-owned;
- loopback hosting and ephemeral sessions are example-only, not a production security/deployment policy.

## Acceptance criteria

- The old generic and in-process-only examples, tests, scripts, and README rows are gone.
- The repository has exactly one documented Petstore flow.
- Test evidence proves MCP `initialize`, `tools/list`, and `tools/call` across actual loopback HTTP.
- Test evidence proves TypeChain `@Agent()` / `buildAgent()` tool selection reaches the MCP client façade.
- No code path adds Petstore write requests, credentials, provider packages, live LLM calls, or external server exposure.
- The repository check suite, production dependency audit, and example runner pass from a clean install.

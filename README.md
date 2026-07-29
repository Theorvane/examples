# Theorvane Petstore MCP Example

A single runnable example showing a truthful end-to-end path from the public [Swagger Petstore v2](https://petstore.swagger.io/) demo API to a TypeChain `@Agent()` that uses an **actual local MCP HTTP session**.

## What this proves

```text
Swagger Petstore v2 GET API
  → injected PetstoreClient
  → TypeMCP @McpServer() / @McpTool()
  → TypeMCP Streamable HTTP handler
  → local 127.0.0.1 ephemeral-port MCP runtime
  → official MCP SDK client session
  → TypeChain @Agent() + @Tool() MCP-client façade
  → TypeChain buildAgent() / LangChain agent loop
```

The fixture run proves the MCP SDK client performs protocol initialization, `tools/list`, and `tools/call` over loopback Streamable HTTP. It also proves a LangChain `FakeToolCallingModel` selects `search_available_pets`, and the TypeChain `@Agent()` façade sends that call through the MCP client rather than calling the REST client or TypeMCP server directly.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer

```bash
npm ci
npm run check
```

## Run the deterministic MCP agent example

```bash
npm run example:petstore:mcp-agent:fixture
```

It starts an in-process Node HTTP server bound only to `127.0.0.1` on an ephemeral port, connects the official MCP SDK `StreamableHTTPClientTransport`, discovers the tools, runs the agent loop, and shuts down the MCP client session and HTTP server in `finally` blocks.

Expected result contains fixture data:

```json
{
  "discoveredTools": [
    "search_available_pets",
    "get_pet",
    "get_petstore_inventory"
  ],
  "tool": "search_available_pets",
  "result": [
    { "id": 1, "name": "Milo", "status": "available" },
    { "id": 2, "name": "Nori", "status": "available" }
  ]
}
```

For the narrower protocol-only smoke run (loopback URL, 404 route boundary, `tools/list`, and `tools/call`), use:

```bash
npm run example:petstore:mcp:fixture
```

## Optional public REST smoke run

```bash
npm run example:petstore:live
```

This calls the mutable public Swagger Petstore demo API. Its data and uptime are outside this repository's control, so it is not used by tests or CI. The command is a GET-only REST smoke run; it does **not** demonstrate MCP client connectivity or a model-backed agent.

## Read-only Petstore contract

`PetstoreClient` has a fixed base URL, `https://petstore.swagger.io/v2`, and only sends `GET` requests. The TypeMCP server exposes exactly three tools:

| MCP tool | REST operation |
| --- | --- |
| `search_available_pets` | `GET /pet/findByStatus?status=available` |
| `get_pet` | `GET /pet/{petId}` |
| `get_petstore_inventory` | `GET /store/inventory` |

The example has no create, update, delete, API-key, credential, environment-configured API host, or public listener path.

## Application-owned model runtime

The fixture uses `FakeToolCallingModel`, not a live provider. An application that wants a real model must install/configure that model itself, then pass it together with a connected MCP client to the agent builder:

```ts
import { buildPetstoreMcpAgent } from "./examples/typechain-petstore-mcp-agent.js";

// The consuming application chooses, authenticates, and authorizes this model.
declare const applicationModel: Parameters<
  typeof buildPetstoreMcpAgent
>[0]["model"];

// The application owns the lifecycle of this client connection.
declare const connectedMcpClient: Parameters<
  typeof buildPetstoreMcpAgent
>[0]["client"];

const agent = buildPetstoreMcpAgent({
  model: applicationModel,
  client: connectedMcpClient,
});
```

This repository deliberately does not select a provider/model, install provider SDKs, read credentials or `process.env`, run a live LLM command, or implement authorization/retry/audit/redaction policy.

## Example-only runtime boundary

The loopback runtime is a deterministic integration example, not a production deployment recipe. It intentionally does **not** provide public hosting, authentication, authorization, durable sessions, a reverse proxy, observability, deployment configuration, or persistent MCP lifecycle management. A production application must own those decisions.

## Development

```bash
npm run lint
npm run build
npm test
npm run audit:prod
npm run check
```

## Packages

- [`@theorvane/type-chain`](https://www.npmjs.com/package/@theorvane/type-chain) `0.1.1`
- [`@theorvane/type-mcp`](https://www.npmjs.com/package/@theorvane/type-mcp) `0.2.2` or later within the `0.2.x` range

## License

[MIT](LICENSE) © Theorvane

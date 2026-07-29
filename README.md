# Theorvane Examples

Runnable, minimal examples for [TypeChain](https://github.com/Theorvane/type-chain) and [TypeMCP](https://github.com/Theorvane/type-mcp). Every example uses the published packages, explicit Zod schemas, standard TypeScript decorators, and application-owned runtime boundaries.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer

```bash
npm install
npm run check
```

## Examples

| Example | Run | Demonstrates |
| --- | --- | --- |
| [Swagger Petstore TypeMCP wrapper](examples/typemcp-petstore-server.ts) | `npm run example:petstore:live` | Wrap public Swagger Petstore **read-only** operations in `@McpServer()` / `@McpTool()` declarations. |
| [Swagger Petstore TypeChain workflow](examples/typechain-petstore-agent.ts) | `npm run example:petstore:agent` | Adapt the Petstore TypeMCP tool into an in-process TypeChain/LangChain-compatible tool and deterministically summarize live available pets. |
| [TypeChain tool definition](examples/typechain-tool-definition.ts) | `npm run example:typechain` | Foundational `@Tool()` metadata and direct receiver-bound invocation. |
| [TypeChain policy guard](examples/typechain-policy-guard.ts) | `npm run example:policy` | Foundational `@Policy()` declaration plus an application-owned approval/audit decision. |
| [TypeMCP server definition](examples/typemcp-server-definition.ts) | `npm run example:typemcp` | Minimal decorator and explicit compilation reference. |
| [TypeMCP → TypeChain bridge](examples/typemcp-langchain-bridge.ts) | `npm run example:bridge` | Minimal in-process adapter reference. |

## Swagger Petstore scenario

The primary scenario uses the public [Swagger Petstore v2](https://petstore.swagger.io/) demo API at the fixed base URL `https://petstore.swagger.io/v2`.

```bash
# Real public GET calls: available pets, one pet detail, and inventory.
npm run example:petstore:live

# Real TypeChain → adapted TypeMCP tool call followed by a deterministic summary.
npm run example:petstore:agent

# Deterministic fixtures used by unit tests; no network request.
npm run example:petstore:typemcp:fixture
npm run example:petstore:agent:fixture
```

The TypeMCP server exposes exactly three tools: `search_available_pets`, `get_pet`, and `get_petstore_inventory`. The client fixes the public HTTPS base URL, sends only `GET` requests, applies a timeout, validates JSON response shapes, and contains no API-key, credential, create, update, or delete operation.

The public Petstore service is demo infrastructure: records, status counts, and availability can change or be unavailable. Consequently, CI and unit tests use injected fixtures, while the two `:live` commands are intentional manual smoke demonstrations. The TypeChain workflow deterministically selects and calls the adapted `search_available_pets` tool; it is **not** an LLM-driven agent and it does not create an MCP client/session or host an MCP transport.

## Boundaries that the examples intentionally preserve

These examples show declaration and adapter boundaries, not a full hosted application:

- The application owns API credentials, authorization, approval, retries, timeouts, audit persistence, and redaction.
- TypeMCP transport selection and MCP session lifecycle are application decisions. The examples do not start a stdio or HTTP server.
- The bridge is in-process only. It adapts a decorated TypeMCP class to LangChain tools; it does not create an MCP client or network connection.
- No model provider is configured. Add a model only in your application after deciding its credentials, authorization, and runtime policy.

## Dependency-security boundary

These examples use the published `@theorvane/type-mcp@^0.2.2` remediation. Its consumer-enforceable dependency contract resolves `@modelcontextprotocol/sdk@1.30.0` and `@hono/node-server@2.0.12`; `npm run audit:prod` verifies the installed production graph with no local npm override.

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

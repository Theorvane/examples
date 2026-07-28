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
| [TypeChain tool definition](examples/typechain-tool-definition.ts) | `npm run example:typechain` | `@Tool()` metadata and direct receiver-bound invocation. |
| [TypeChain policy guard](examples/typechain-policy-guard.ts) | `npm run example:policy` | `@Policy()` declaration plus an application-owned approval/audit decision. |
| [TypeMCP server definition](examples/typemcp-server-definition.ts) | `npm run example:typemcp` | `@McpServer()`, `@McpTool()`, metadata inspection, and explicit compilation. |
| [TypeMCP → TypeChain bridge](examples/typemcp-langchain-bridge.ts) | `npm run example:bridge` | Adapt a TypeMCP server into in-process LangChain-compatible tools through TypeChain. |

## Boundaries that the examples intentionally preserve

These examples show declaration and adapter boundaries, not a full hosted application:

- The application owns API credentials, authorization, approval, retries, timeouts, audit persistence, and redaction.
- TypeMCP transport selection and MCP session lifecycle are application decisions. The examples do not start a stdio or HTTP server.
- The bridge is in-process only. It adapts a decorated TypeMCP class to LangChain tools; it does not create an MCP client or network connection.
- No model provider is configured. Add a model only in your application after deciding its credentials, authorization, and runtime policy.

## Dependency-security boundary

The published `@theorvane/type-mcp` package currently exact-pins an MCP SDK release whose transitive `@hono/node-server` graph is affected by [GHSA-frvp-7c67-39w9](https://github.com/advisories/GHSA-frvp-7c67-39w9). This **examples application** uses an npm `overrides` entry to resolve its lockfile to `@modelcontextprotocol/sdk@1.30.0` and `@hono/node-server@2.0.12`; `npm run audit:prod` verifies the resulting production graph.

This override is intentionally scoped to this repository and is **not a remediation for downstream TypeMCP consumers**. The package-level remediation remains tracked in [Theorvane/type-mcp#93](https://github.com/Theorvane/type-mcp/issues/93).

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
- [`@theorvane/type-mcp`](https://www.npmjs.com/package/@theorvane/type-mcp) `0.2.0`

## License

[MIT](LICENSE) © Theorvane

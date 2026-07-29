# Swagger Petstore Agent Implementation Plan

> **Status: superseded.** The initial in-process TypeMCP adapter workflow described below was replaced by the [real MCP HTTP agent design](../superpowers/specs/2026-07-29-petstore-real-mcp-agent-design.md) and its [implementation plan](2026-07-29-petstore-real-mcp-agent-implementation.md). The active example uses loopback Streamable HTTP, an official MCP SDK client, and TypeChain `@Agent()` / `buildAgent()` façade tools.



**Goal:** Replace the local catalog examples with read-only Swagger Petstore examples that wrap live Petstore GET operations in TypeMCP and show a TypeChain-adapted, deterministic agent-style summary.

**Architecture:** A small injected-fetch `PetstoreClient` owns the fixed public v2 base URL, timeout, GET-only requests, and JSON shape validation. `PetstoreServer` receives that client through TypeMCP’s explicit resolver and exposes `search_available_pets`, `get_pet`, and `get_petstore_inventory`; TypeChain adapts only the search tool into a deterministic summary flow. Unit tests inject fixture fetch responses, while a separate `example:petstore:live` command uses Node’s real `fetch` against the public demo API.

**Tech Stack:** TypeScript strict mode, Node 20+ fetch/AbortSignal, Zod, Vitest, `@theorvane/type-mcp`, TypeChain’s TypeMCP bridge.

---

## Scope and boundaries

- Fixed endpoint: `https://petstore.swagger.io/v2`.
- Allowed operations: `GET /pet/findByStatus?status=available`, `GET /pet/{petId}`, and `GET /store/inventory`.
- The live executable can only read public demo data; it has no write endpoint, API key support, user-supplied base URL, MCP stdio/HTTP hosting, or model-provider integration.
- Deterministic tests must not access the network.
- Live demo output must declare that public demo contents change between invocations.

## Task 1: Add the Petstore client contract and fixture tests

**Files:**
- Create: `examples/petstore-client.ts`
- Create: `test/petstore-client.test.ts`

1. Write failing fixture-fetch tests for available-pet query encoding, `getPet`, inventory normalization, non-OK response error, malformed JSON payload rejection, and timeout/abort behavior.
2. Run `npm test -- --run test/petstore-client.test.ts`; expect missing-module failure.
3. Implement `PetstoreClient` with injected `fetch`, a `readonly` fixed base URL, GET-only request helper, finite positive timeout validation, `AbortSignal.timeout`, response status guard, and Zod schemas.
4. Run the focused test until green; commit the slice.

## Task 2: Add TypeMCP’s Petstore wrapper

**Files:**
- Create: `examples/typemcp-petstore-server.ts`
- Create: `test/typemcp-petstore-server.test.ts`

1. Write failing tests proving declaration metadata contains exactly `search_available_pets`, `get_pet`, and `get_petstore_inventory`, and that injected fixture client calls return normalized Petstore data.
2. Run focused test; expect missing module/decorator implementation failure.
3. Implement `@McpServer({ name: "swagger-petstore", version: "1.0.0" })` and three `@McpTool` methods with explicit Zod inputs. Inject `PetstoreClient` through the constructor and use an explicit resolver for compilation.
4. Verify focused tests and commit the slice.

## Task 3: Add the TypeChain agent-style bridge

**Files:**
- Create: `examples/typechain-petstore-agent.ts`
- Create: `test/typechain-petstore-agent.test.ts`

1. Write a failing deterministic test that creates a server with a fixture client, bridges its TypeMCP search tool with `createTypeMcpLangChainTools`, invokes it, and returns a concise summary containing current available-pet details.
2. Run the focused test and confirm it fails because the agent module does not exist.
3. Implement `summarizeAvailablePets` with an explicit server resolver, tool lookup by its TypeMCP declaration name, input validation delegated to the adapted tool, and a plain deterministic summary—not LLM inference.
4. Run focused and full tests, then commit.

## Task 4: Provide live read-only executable commands

**Files:**
- Create: `examples/petstore-live.ts`
- Modify: `package.json`
- Modify: `test/run-example.ts` only if the current generic runner needs a deterministic fixture mode.

1. Write a failing test for a separate deterministic fixture-mode runner where necessary; do not put live network calls in normal unit tests.
2. Add `example:petstore:live` to call the real client and print a compact JSON payload containing `source`, `readOnly`, selected available pets, one resolved pet detail when an ID exists, and normalized inventory counts.
3. Add `example:petstore:agent` to execute the live TypeChain/TypeMCP path and emit its summary.
4. Run both live commands manually after tests pass. A transient upstream error must be surfaced honestly rather than simulated as success.
5. Commit this slice.

## Task 5: Update developer documentation and validate release quality

**Files:**
- Modify: `README.md`
- Modify: `.github/workflows/verify.yml` only if it needs fixture-only commands added; never add public-network calls to CI.

1. Document the Petstore TypeMCP wrapper, TypeChain bridge, live commands, fixed endpoint, public-demo volatility, read-only policy, and no-model-provider boundary.
2. Preserve existing local catalog examples only if still pedagogically distinct; otherwise remove stale commands/tests/docs in the same change.
3. Run: `npm run format`, `npm run lint`, `npm run build`, `npm test`, `npm run audit:prod`, `npm run check`, `git diff --check`.
4. Run both explicit live commands and capture actual output only in verification notes/PR, never as hardcoded test data.
5. Commit, push, open a `dev` PR, obtain exact-head review/CI, then use the established reviewed `dev → main` promotion path.

## Acceptance cases

| Case | Expected behavior |
| --- | --- |
| Available pet lookup | Client encodes `status=available`; TypeMCP tool returns validated Petstore records. |
| Pet detail | Tool takes a positive numeric ID and returns validated normalized detail. |
| Inventory | Tool returns a validated string-to-nonnegative-number map. |
| Untrusted API response | Invalid JSON shape and non-2xx status fail with descriptive error. |
| Timeout | Slow fetch is aborted; no hidden retry/write action is attempted. |
| Agent flow | TypeChain calls the TypeMCP-adapted search tool and returns a deterministic human-readable live-data summary. |
| Offline CI | All unit tests use fixture fetch; CI performs no Petstore request. |
| Safety | No write method, credential field, configurable base URL, hosted MCP transport, or model-provider behavior is introduced. |

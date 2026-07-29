# Real TypeChain Petstore Agent Implementation Plan

> **For Hermes:** Implement this issue-scoped plan with test-first slices and preserve the `dev` → release-only `main` workflow.

**Goal:** Add a real LangChain agent factory that uses TypeChain `createTypeMcpAgent()` to operate the existing read-only Swagger Petstore TypeMCP tools, while keeping provider credentials and runtime selection application-owned.

**Architecture:** Create a narrowly scoped `createPetstoreAgent()` factory. It accepts a caller-provided LangChain chat model and an optional resolver-backed `PetstoreServer`, then delegates agent construction to TypeChain's `createTypeMcpAgent()`. A test uses LangChain's `FakeToolCallingModel` plus the existing deterministic fixture server to prove an actual agent loop selects and invokes `search_available_pets`; no network or model provider runs in CI. A separate manual composition example accepts a model from the caller rather than initializing a provider or reading a secret.

**Tech stack:** TypeScript, Vitest, LangChain `FakeToolCallingModel`, `@theorvane/type-chain/typemcp`, TypeMCP decorators, Zod.

---

### Task 1: Define and prove the real agent factory contract

**Files:**
- Create: `test/typechain-petstore-real-agent.test.ts`
- Create: `examples/typechain-petstore-real-agent.ts`

1. Write a failing integration test importing `createPetstoreAgent()`.
2. Use `FakeToolCallingModel` to emit one `search_available_pets` call with `{ limit: 2 }`, followed by an empty tool-call response.
3. Invoke the constructed agent with a user message and assert it includes a LangChain tool message for that call containing the fixture pet result.
4. Run the focused test and observe failure because the module/export does not exist.
5. Implement only the factory: accept `{ model, server? }`, default to a `PetstoreServer`, supply its explicit resolver to `createTypeMcpAgent()`, and return the LangChain agent.
6. Re-run the focused test, then lint and typecheck.

### Task 2: Add executable fixture agent-loop evidence

**Files:**
- Create: `examples/typechain-petstore-real-agent-fixture.ts`
- Modify: `package.json`
- Modify: `test/typechain-petstore-real-agent.test.ts`

1. Write a failing assertion for a runnable fixture command that reports the agent's selected tool and its tool result.
2. Implement the fixture runner with `FakeToolCallingModel` and the existing `createFixturePetstoreServer()`.
3. Add `example:petstore:agent:real:fixture`; do not add a provider package or live credential-dependent command.
4. Run the focused test and fixture command successfully.

### Task 3: Document real-agent composition without adding provider ownership

**Files:**
- Modify: `README.md`
- Modify: `docs/planning/2026-07-29-real-typechain-petstore-agent.md`

1. Document the distinction between the deterministic adapter workflow and the real `createTypeMcpAgent()` factory.
2. Show a short application-owned pseudo-composition snippet with a `model` supplied by the caller. Do not use an API key, `process.env`, or provider-specific package.
3. State that TypeChain constructs the in-process LangChain agent but does not select/configure a provider, host an MCP transport, create an MCP client/session, or authorize tool invocations.
4. Run formatting, full checks, audit, and whitespace checks.

### Task 4: Deliver through governed PRs

1. Commit the plan and implementation in focused commits.
2. Create a `dev` PR closing #21.
3. Obtain exact-head independent review, green `verify`, and resolved threads before squash merge.
4. Reconcile `main` ancestry into `dev` only if required by current remote history, via a two-parent merge with separate review.
5. Create a reviewed `dev` → `main` promotion; require exact-head `verify`, `release-promotion`, independent approval, and resolved threads before squash merge.
6. Clone current `main` cleanly and run `npm ci`, `npm run check`, and the real-agent fixture command.

## Explicit non-goals

- No provider SDK, API key, model identifier, or environment-variable model configuration.
- No automated live LLM invocation in CI.
- No MCP HTTP/stdio server, client/session, or cross-process transport.
- No Petstore write endpoint or credential path.

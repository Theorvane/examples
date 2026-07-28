# Contributing

## Development workflow

1. Open an issue for one focused example or correction.
2. Branch from `dev` using an issue-scoped English branch name.
3. Keep examples runnable without credentials or external service calls unless the example explicitly documents a safe local fixture.
4. Add a focused test for every new example behavior.
5. Run `npm run check` and every relevant `npm run example:*` command before opening a PR.
6. Request an independent review against the exact PR head.

## Scope rules

- Use published Theorvane package versions unless an example is explicitly documenting unpublished development work.
- Keep application-owned security and runtime responsibilities visible; do not imply that TypeChain or TypeMCP supplies credentials, authorization, hosting, session storage, or a model provider.
- Never commit credentials, tokens, `.env` files, or generated local output.

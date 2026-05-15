# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. JSDoc Standards

**Document the contract, not the implementation.**

Always write JSDoc for exported classes, types, functions, and methods.

Rules:
- **Class-level doc**: describe what it is and what it does. Include a usage `@example`.
- **Type/interface fields**: one-line description per field. Document non-obvious defaults, constraints, or edge cases.
- **Method docs**: always include `@param`, `@returns`, and `@throws`. Document edge cases (e.g. 204 No Content, optional params, synthetic error codes).
- **`@template`**: document generic type params when their purpose isn't obvious from the name alone.
- **`@example`**: include on non-trivial methods or anywhere the call site pattern is worth showing.
- **Don't** explain design decisions, rationale, or trade-offs — those belong in PRs or commit messages, not JSDoc.
- **Don't** write sentences like "Separating X from Y keeps Z..." or "Designed around N constraints" — document the contract, not the thinking.
- **Don't** write JSDoc for private methods unless the logic is non-obvious to a future maintainer.

Example of good method JSDoc:
```ts
/**
 * Issues a DELETE request.
 *
 * Defaults `T` to `void` since DELETE typically returns 204 No Content.
 *
 * @template T - Shape of the expected response body. Defaults to `void`.
 * @param path - Path appended to `baseUrl`.
 * @returns `void` on 204 No Content, or parsed JSON typed as `T` if the server returns a body.
 * @throws {ApiError} On non-2xx response, missing session, or timeout.
 */
```

## 6. Read Reference Files Every Prompt

**At the start of a new session, read `AGENTS.md` and load it into session memory.**

`AGENTS.md` is the authoritative architecture reference: tech stack, directory structure, routing, styling rules, component conventions, service patterns, and naming conventions. Always consult it before making structural decisions.

This ensures rules stay active across long sessions and don't drift. No exceptions.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

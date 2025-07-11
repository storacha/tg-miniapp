---
applyTo: "**"
---

Coding standards, domain knowledge, and preferences that AI should follow.

## Project Context

- Telegram Mini App for Storacha backup
- Next.js, TypeScript, PostgreSQL, AWS deployment
- Use existing patterns from codebase

## Code Style

- Always use TypeScript with proper types, avoid `any`
- Use useMemo for expensive operations
- Follow existing component patterns
- Handle errors with fromResult, getErrorMessage and setError pattern
- Don't use ';' at the end of lines
- Use `const` for constants, `let` for variables that change

## React Patterns

- Functional components with hooks
- Extract custom hooks for reusable logic
- Use Tailwind for styling

## Reference Files

- `api.ts` for types
- Existing components for patterns

## Documentation Links

- **Telegram API**: https://gram.js.org/tl/messages/GetDialogs AND https://tl.telethon.dev/index.html
- **Telegram Apps SDK**: https://docs.telegram-mini-apps.com/
- **Storacha Docs**: [Add Storacha documentation links]
- **Next.js**: https://nextjs.org/docs

# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds app code: UI (`components`), store logic (`store`), hooks (`hooks`), helpers (`lib`, `utils`), and feature configs (`config`).
- Service layers for TTS, OpenRouter, and Google Drive live under `src/services`; docs and architecture notes stay in `docs/`.
- Automation scripts are in `scripts/`, localization bundles in `locales/`, and production artifacts in `dist/` (never edit by hand).

## Build, Test, and Development Commands
- `bun install` syncs dependencies; rerun after pulling changes.
- `bun run dev` (or `bun run start` to skip cache cleanup) launches Vite locally; `bun run preview` serves the built bundle.
- `bun run build` creates optimized assets in `dist/`; attach the output only when release steps require it.
- `bun run lint` enforces ESLint and TypeScript constraints before committing.
- Domain QA helpers: `bun run test:api-chunks`, `bun run test:model-championship`, `bun run test:tools-support`, and `bun run test:free-models-benchmark` (each invokes its peer script in `scripts/`).

## Coding Style & Naming Conventions
- Use TypeScript + functional React components; `PascalCase` components, `camelCase` utilities/hooks, and `UPPER_SNAKE_CASE` constants.
- Stick to two-space indentation, Tailwind utility classes for styling, and colocated logic (component + helper lives together inside `src/components/<Feature>`).
- ESLint (see `eslint.config.js`) is the source of truth; fix-or-explain lint violations rather than suppressing rules.

## Testing Guidelines
- Add new TSX runners under `scripts/` when expanding coverage; mirror the command name (`bun run test:new-surface`) to keep tooling predictable.
- Document manual test steps for flows touching multilingual assets, speech services, or synchronization, and capture console output when benchmarking.

## Commit & Pull Request Guidelines
- Conventional commits (`feat:`, `fix:`, `chore:`, `version:`) keep history searchable; include a short scope when helpful.
- Squash noisy WIP commits; ensure lint/tests/build commands from this guide are listed in the PR description alongside screenshots for UI updates.
- Reference Jira/GitHub issues where applicable and note any configuration changes reviewers must make locally.

## Security & Configuration Tips
- Secrets (OpenRouter, Azure, Ollama) funnel through `src/config/*.ts`; read values from environment variables or secured storage, never from committed files.
- Sanitize logs emitted from `src/services` and `scripts/`, and verify translations in `locales/` before syncing them to production datasets.
